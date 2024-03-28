import { S3Client } from '@aws-sdk/client-s3'
import { Octokit, type RestEndpointMethodTypes } from '@octokit/rest'
import { Upload } from '@aws-sdk/lib-storage'
import axios from 'axios'
import { joinPaths } from './s3-utils'

export type GitHubReleaseAsset = RestEndpointMethodTypes['repos']['listReleaseAssets']['response']['data'][number]

const uploadFileFromGitHubToS3 = async ({ url, bucket, objectKey, githubToken, s3Client }: { url: string; bucket: string; objectKey: string; githubToken: string; s3Client: S3Client }): Promise<void> => {
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

type UploadReleaseAssetsToS3Params = {
  githubToken: string
  owner: string
  repo: string
  releaseId: number
  s3: {
    endpoint: string
    region: string
    bucket: string
    folder: string
    accessKeyId: string
    secretAccessKey: string
  }
}

export const listGithubReleaseAssets = async ({ githubToken, owner, repo, releaseId }: { githubToken: string; owner: string; repo: string; releaseId: number }): Promise<GitHubReleaseAsset[]> => {
  try {
    console.log('Will list all github release assets', { owner, repo, releaseId })
    const octokit = new Octokit({ auth: githubToken })
    let assets: GitHubReleaseAsset[] = []
    let page = 1
    let hasNextPage = true
    while (hasNextPage) {
      const response = await octokit.repos.listReleaseAssets({ owner, repo, release_id: releaseId, per_page: 100, page })
      assets = assets.concat(response.data)
      hasNextPage = response.headers?.link?.includes('rel="next"') || false
      if (hasNextPage) {
        page++
      }
    }
    return assets
  } catch (error) {
    console.error('Unexpected error listing release assets', { owner, repo, releaseId, error })
    throw new Error(`Unexpected error listing release assets: ${(error as Error).message}`, { cause: error })
  }
}

export const uploadReleaseAssetsToS3 = async ({ githubToken, owner, repo, releaseId, s3: { endpoint, region, accessKeyId, secretAccessKey, bucket, folder } }: UploadReleaseAssetsToS3Params): Promise<GitHubReleaseAsset[]> => {
  // List GitHub assets
  const allGithubAssets = await listGithubReleaseAssets({ githubToken, owner, repo, releaseId })

  // Transfer assets from GitHub to S3
  console.log(`Will transfer ${allGithubAssets.length} from release "${releaseId}" to S3`)
  const s3Client = new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey } })
  await Promise.all(
    allGithubAssets.map(async (githubAsset): Promise<void> => {
      console.log('Will upload', githubAsset.name)
      // The "githubAsset.browser_download_url" does not work, we need to build the download URL like so:
      const url = `https://api.github.com/repos/${owner}/${repo}/releases/assets/${githubAsset.id}`
      const objectKey = joinPaths(folder, githubAsset.name)
      await uploadFileFromGitHubToS3({ url, objectKey, bucket, githubToken, s3Client })
      console.log('Did upload', githubAsset.name)
    })
  )
  console.log(`Did transfer ${allGithubAssets.length} from release "${releaseId}" to S3`)
  return allGithubAssets
}
