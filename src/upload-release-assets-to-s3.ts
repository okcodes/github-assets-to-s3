import { S3Client } from '@aws-sdk/client-s3'
import core from '@actions/core'
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest'
import { Upload } from '@aws-sdk/lib-storage'
import axios from 'axios'
import type { SummaryTableRow } from '@actions/core/lib/summary.js'
type GitHubRelease = RestEndpointMethodTypes['repos']['listReleases']['response']['data'][number]

const uploadFileFromGitHubToS3 = async ({ url, bucket, objectKey, githubToken, s3Client }: { url: string; bucket: string; objectKey: string; githubToken: string; s3Client: S3Client }) => {
  try {
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/octet-stream',
      },
    })

    await new Upload({ client: s3Client, params: { Bucket: bucket, Key: objectKey, Body: response.data } }).done()
  } catch (err) {
    throw new Error(`Error uploading from GitHub to S3: ${(err as Error).message}`, { cause: err })
  }
}

const headers: SummaryTableRow = [{ data: 'Asset', header: true }]

const getDraftReleaseByTag = async ({ tag, repo, octokit, owner }: { octokit: Octokit; tag: string; repo: string; owner: string }): Promise<GitHubRelease | undefined> => {
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const releases = await octokit.repos.listReleases({ owner, repo, per_page: 100, page })
    const foundRelease = releases.data.find(_ => _.tag_name === tag)
    if (foundRelease) {
      return foundRelease
    }
    hasNextPage = releases.headers?.link?.includes('rel="next"') || false
    if (hasNextPage) {
      page++
    }
  }

  return void 0
}

export const getReleaseId = async ({ githubToken, owner, repo, tag }: { githubToken: string; owner: string; repo: string; tag: string }): Promise<number> => {
  console.log(`Will get ID of release by tag "${tag}".`)
  const octokit = new Octokit({ auth: githubToken })
  try {
    const publishedRelease = await octokit.rest.repos.getReleaseByTag({ owner, repo, tag })
    return publishedRelease.data.id
  } catch (error) {
    // If error is not 404, it's an unknown error.
    if ((error as any).status !== 404) {
      console.error('Unexpected error getting release by tag', { owner, repo, tag, error })
      throw new Error(`Unexpected error getting GitHub release by tag "${tag}": ${(error as Error).message}`, { cause: error })
    }
    // If received 404 error, we can still try to find the release by looping through all the releases.
    const draftRelease = await getDraftReleaseByTag({ tag, repo, owner, octokit })
    if (!draftRelease) {
      // If after looping through all releases, none is found, throw.
      throw new Error(`Release with "${tag}" was not found in the published and draft releases.`)
    }
    return draftRelease.id
  }
}

export type UploadReleaseAssetsToS3Params = {
  githubToken: string
  owner: string
  repo: string
  releaseId: number
  s3: {
    endpoint: string
    region: string
    bucket: string
    accessKeyId: string
    secretAccessKey: string
  }
}

export const uploadReleaseAssetsToS3 = async ({ githubToken, owner, repo, releaseId, s3: { endpoint, region, accessKeyId, secretAccessKey, bucket } }: UploadReleaseAssetsToS3Params): Promise<void> => {
  // List GitHub assets
  const octokit = new Octokit({ auth: githubToken })
  // TODO: Implement pagination since max 100 assets per req are returned.
  const allGithubAssets = await octokit.repos.listReleaseAssets({ owner, repo, release_id: releaseId, per_page: 100 })

  // Transfer assets from GitHub to S3
  console.log(`Will transfer ${allGithubAssets.data.length} from release "${releaseId}" to S3`)
  const s3Client = new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey } })
  const transfers = await Promise.all(
    allGithubAssets.data.map(async (githubAsset): Promise<{ publicUrl: string; name: string }> => {
      console.log('Will upload', githubAsset.name)
      // The "githubAsset.browser_download_url" does not work, we need to build the download URL like so:
      const url = `https://api.github.com/repos/${owner}/${repo}/releases/assets/${githubAsset.id}`
      await uploadFileFromGitHubToS3({ url, objectKey: githubAsset.name, bucket, githubToken, s3Client })
      const publicUrl = getBackBlazeDownloadUrl({ bucket, region, filename: githubAsset.name })
      console.log('Did upload', githubAsset.name, publicUrl)
      return { publicUrl, name: githubAsset.name }
    })
  )
  console.log(`Did transfer ${allGithubAssets.data.length} from release "${releaseId}" to S3`)

  // Write summary
  core.summary.addHeading(`${transfers.length} release assets transferred from GitHub to S3`, 2)
  const tableData: SummaryTableRow[] = transfers.map(_ => [`<a href="${_.publicUrl}">${_.name}</a>`])
  core.summary.addTable([headers, ...tableData])
  await core.summary.write()
}

// TODO: Don't hardcode black-blaze
const getBackBlazeDownloadUrl = ({ bucket, region, filename }: { bucket: string; region: string; filename: string }) => `https://${bucket}.s3.${region}.backblazeb2.com/${filename}`
