import * as core from '@actions/core'
import { VERSION } from './version'
import { getReleaseId, uploadReleaseAssetsToS3 } from './upload-release-assets-to-s3'

export type ActionInputs = 'endpoint' | 'region' | 'accessKeyId' | 'secretAccessKey' | 'bucket' | 'repository' | 'releaseId' | 'releaseTag' | 'githubToken'

const input = (name: ActionInputs, options: core.InputOptions): string => core.getInput(name, options)

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

    // GitHub inputs
    const repository = input('repository', { required: true, trimWhitespace: true })
    const releaseIdStr = input('releaseId', { required: false, trimWhitespace: true })
    const releaseTag = input('releaseTag', { required: false, trimWhitespace: true })
    const githubToken = input('githubToken', { required: true, trimWhitespace: true })

    // Validate repository
    const [owner, repo] = repository.split('/')
    if (!owner || !repo) {
      core.setFailed('The "repository" input must follow the format "owner/repo"')
      return
    }

    // Validate releaseId and releaseTag
    if (!releaseIdStr && !releaseTag) {
      core.setFailed('You must provide either the "releaseId" or the "releaseTag" input.')
      return
    }

    if (releaseIdStr && releaseTag) {
      core.setFailed('You must provide only one either the "releaseId" or the "releaseTag" input but not both.')
      return
    }

    if (releaseIdStr && !isNaN(+releaseIdStr)) {
      core.setFailed('When you provide "releaseId", it must be a number.')
    }

    console.log('Action called with:', { endpoint, region, bucket, repository, owner, repo, releaseIdStr, releaseTag })

    // Obtain release ID
    const releaseId = releaseIdStr ? +releaseIdStr : await getReleaseId({ githubToken, owner, repo, releaseTag })
    console.log('Release ID', releaseId)

    // Transfer
    console.log('Will transfer from GitHub to S3', releaseId)
    await uploadReleaseAssetsToS3({ githubToken, owner, repo, releaseId, s3: { endpoint, region, bucket, accessKeyId, secretAccessKey } })
    console.log('Did transfer from GitHub to S3', releaseId)
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.error('Action failed:', error)
    core.setFailed(`Action failed: ${(error as Error).message}`)
  }
}
