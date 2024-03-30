import * as core from '@actions/core'
import { VERSION } from './version'
import { getReleaseIdByTag } from './github-release-utils'
import { GH2S3Transfer, uploadReleaseAssetsToS3 } from './github-to-s3-utils'
import { writeActionSummary } from './action-summary-utils'
import { updateReleaseSummary } from './github-release-summary-update'
import { generateObjectUrlBase, joinPaths } from './s3-utils'

export type ActionInputs = 'endpoint' | 'region' | 'accessKeyId' | 'secretAccessKey' | 'bucket' | 'folder' | 'repository' | 'releaseId' | 'releaseTag' | 'githubToken'
export type ActionBooleanInputs = 'useTauriSummaryOnRelease'

const input = (name: ActionInputs, options: core.InputOptions): string => core.getInput(name, options)
const booleanInput = (name: ActionBooleanInputs, options: core.InputOptions): boolean => core.getBooleanInput(name, options)

const VALID_ENDPOINT_PROTOCOLS: string[] = ['https://']

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    console.log(`Running okcodes/github-assets-to-s3 action v${VERSION}`)

    // S3 inputs
    const endpoint = input('endpoint', { required: true, trimWhitespace: true })
    const region = input('region', { required: true, trimWhitespace: true })
    const accessKeyId = input('accessKeyId', { required: true, trimWhitespace: true })
    const secretAccessKey = input('secretAccessKey', { required: true, trimWhitespace: true })
    const bucket = input('bucket', { required: true, trimWhitespace: true })
    const folder = input('folder', { required: false, trimWhitespace: true })

    // GitHub inputs
    const repository = input('repository', { required: true, trimWhitespace: true })
    const releaseIdStr = input('releaseId', { required: false, trimWhitespace: true })
    const releaseTag = input('releaseTag', { required: false, trimWhitespace: true })
    const githubToken = input('githubToken', { required: true, trimWhitespace: true })
    const useTauriSummaryOnRelease = booleanInput('useTauriSummaryOnRelease', { required: false, trimWhitespace: true })

    // Validate repository
    const [owner, repo] = repository.split('/')
    if (!owner || !repo) {
      core.setFailed('The "repository" input must follow the format "owner/repo"')
      return
    }

    // Validate releaseId and releaseTag
    if (!releaseIdStr && !releaseTag) {
      core.setFailed('You must provide either "releaseId" or "releaseTag".')
      return
    }

    if (releaseIdStr && releaseTag) {
      core.setFailed('You must provide only one either "releaseId" or "releaseTag" but not both.')
      return
    }

    if (releaseIdStr && isNaN(+releaseIdStr)) {
      core.setFailed('When you provide "releaseId", it must be a number.')
      return
    }

    // Validate S3 endpoint
    if (!VALID_ENDPOINT_PROTOCOLS.some(validProtocol => endpoint.startsWith(validProtocol))) {
      core.setFailed(`The input "endpoint" must start with a valid protocol, like: ${VALID_ENDPOINT_PROTOCOLS.join(', ')}`)
      return
    }

    console.log('Action called with:', { endpoint, region, bucket, repository, owner, repo, releaseIdStr, releaseTag })

    // Obtain release ID
    const releaseId = releaseIdStr ? +releaseIdStr : await getReleaseIdByTag({ githubToken, owner, repo, tag: releaseTag })
    console.log('Release ID', releaseId)

    // Transfer
    console.log('Will transfer from GitHub to S3', releaseId)
    const transfers = await uploadReleaseAssetsToS3({ githubToken, owner, repo, releaseId, s3: { endpoint, region, bucket, folder, accessKeyId, secretAccessKey } })
    const s3BaseUrl = generateObjectUrlBase(endpoint, bucket)
    const getS3UrlForTransfer = (transfer: GH2S3Transfer): string => joinPaths(s3BaseUrl, folder, transfer.asset.name)
    if (useTauriSummaryOnRelease) {
      await updateReleaseSummary({ owner, repo, releaseId, githubToken, transfers, getS3UrlForTransfer })
    }
    await writeActionSummary({ transfers, getS3UrlForTransfer, releaseId, owner, repo, githubToken })
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.error('Action failed:', error)
    core.setFailed(`Action failed: ${(error as Error).message}`)
  }
}
