import { S3Client } from '@aws-sdk/client-s3'
import core from '@actions/core'
import { Octokit } from '@octokit/rest'
import { Upload } from '@aws-sdk/lib-storage'
import axios from 'axios'
import type { SummaryTableRow } from '@actions/core/lib/summary.js'

type ActionInputs = 'endpoint' | 'region' | 'accessKeyId' | 'secretAccessKey' | 'bucket' | 'repository' | 'releaseTag' | 'githubToken'

const input = (name: ActionInputs) => core.getInput(name, { required: true, trimWhitespace: true })

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

export const uploadReleaseAssetsToS3 = async (): Promise<void> => {
  const endpoint = input('endpoint')
  const region = input('region')
  const accessKeyId = input('accessKeyId')
  const secretAccessKey = input('secretAccessKey')
  const bucket = input('bucket')
  const repository = input('repository')
  const releaseTag = input('releaseTag')
  const githubToken = input('githubToken')

  const [owner = '', repo = ''] = repository.split('/')
  console.log('Action Called With', { endpoint, region, bucket, repository, owner, repo, releaseTag, githubToken })

  try {
    // Get release
    const octokit = new Octokit({ auth: githubToken })
    const theRelease = await octokit.rest.repos.getReleaseByTag({ owner, repo, tag: releaseTag })
    // TODO: Implement pagination since max 100 assets per req are returned.
    const theAssets = await octokit.repos.listReleaseAssets({ owner, repo, release_id: theRelease.data.id, per_page: 100 })
    console.log(`Will transfer ${theAssets.data.length} from release "${releaseTag}" to S3`)

    // Transfer all the assets
    const s3Client = new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey } })
    const transfers = await Promise.all(
      theAssets.data.map(async (asset) => {
        console.log('Will upload', asset.name)
        // The "asset.browser_download_url" does not work, we need to build the download URL like so:
        const url = `https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`
        await uploadFileFromGitHubToS3({ url, objectKey: asset.name, bucket, githubToken, s3Client })
        const publicUrl = getBackBlazeDownloadUrl({ bucket, region, filename: asset.name })
        console.log('Did upload', asset.name, publicUrl)
        return { publicUrl, name: asset.name }
      })
    )
    console.log(`Did transfer ${theAssets.data.length} from release "${releaseTag}" to S3`)

    // Write summary
    core.summary.addHeading(`${transfers.length} release assets transferred from GitHub to S3`, 2)
    const tableData: SummaryTableRow[] = transfers.map((_) => [`<a href="${_.publicUrl}">${_.name}</a>`])
    core.summary.addTable([headers, ...tableData])
    await core.summary.write()
  } catch (err) {
    core.setFailed(`Error transferring assets: ${(err as Error).message}`)
  }
}

const getBackBlazeDownloadUrl = ({ bucket, region, filename }: { bucket: string; region: string; filename: string }) => `https://${bucket}.s3.${region}.backblazeb2.com/${filename}`
