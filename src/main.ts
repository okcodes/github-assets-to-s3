import * as core from '@actions/core'
import { VERSION } from './version'

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
    const releaseId = input('releaseId', { required: false, trimWhitespace: true })
    const releaseTag = input('releaseTag', { required: false, trimWhitespace: true })
    const githubToken = input('githubToken', { required: true, trimWhitespace: true })

    // Validate repository
    const [owner, repo] = repository.split('/')
    if (!owner || !repo) {
      core.setFailed('The "repository" input must follow the format "owner/repo"')
      return
    }

    // Validate releaseId and releaseTag
    if (!releaseId && !releaseTag) {
      core.setFailed('You must provide either the "releaseId" or the "releaseTag" input.')
      return
    }

    if (releaseId && releaseTag) {
      core.setFailed('You must provide only one either the "releaseId" or the "releaseTag" input but not both.')
      return
    }

    console.log('Action called with:', { endpoint, region, bucket, repository, owner, repo, releaseId, releaseTag })
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.error('Action failed:', error)
    core.setFailed(`Action failed: ${(error as Error).message}`)
  }
}
