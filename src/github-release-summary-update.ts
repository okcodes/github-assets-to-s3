import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'
import { type GH2S3Transfer } from './github-to-s3-utils'
import { getTransfersSummaryTablesMarkdown } from './summary-builder'

type UpdateReleaseSummaryParams = {
  githubToken: string
  owner: string
  repo: string
  releaseId: number
  transfers: GH2S3Transfer[]
  getS3UrlForTransfer: (assetName: GH2S3Transfer) => string
}

const START = '<!-- start -->'
const END = '<!-- end -->'

export const updateReleaseSummary = async ({ owner, repo, releaseId, githubToken, transfers, getS3UrlForTransfer }: UpdateReleaseSummaryParams): Promise<void> => {
  try {
    const octokit = new Octokit({ auth: githubToken })
    const release = await octokit.repos.getRelease({ owner, repo, release_id: releaseId })
    const transferSummary = getTransfersSummaryTablesMarkdown(release.data.tag_name, transfers, getS3UrlForTransfer)
    const originalBody = release.data.body || ''
    const updating = originalBody.includes(START)
    const newBody = updating ? originalBody.replace(/<!-- start -->[\s\S]*?<!-- end -->/, `${START}\n\n${transferSummary}${END}`) : `${originalBody}${START}\n\n${transferSummary}${END}`
    await octokit.repos.updateRelease({ owner, repo, release_id: releaseId, body: newBody, tag_name: release.data.tag_name })
  } catch (error) {
    // Don't fail the whole action, the summary is just a nice-to-have.
    console.error('Error updating release', error)
    core.warning(`Error updating release body with S3 transfers summary: ${(error as Error).message}`)
  }
}
