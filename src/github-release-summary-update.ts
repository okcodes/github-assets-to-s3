import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'

type UpdateReleaseSummaryParams = {
  githubToken: string
  owner: string
  repo: string
  releaseId: number
}

export const updateReleaseSummary = async ({ owner, repo, releaseId, githubToken }: UpdateReleaseSummaryParams) => {
  try {
    const octokit = new Octokit({ auth: githubToken })
    const release = await octokit.repos.getRelease({ owner, repo, release_id: releaseId })
    const old = release.data.body
    const newBody = `${old}\n\nNew content`
    const updateResult = await octokit.repos.updateRelease({ owner, repo, release_id: releaseId, body: newBody })
  } catch (error) {
    // Don't fail the whole action, the summary is just a nice-to-have.
    console.error('Error updating release', error)
    core.warning(`Error updating release body with S3 transfers summary: ${(error as Error).message}`)
  }
}
