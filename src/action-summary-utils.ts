import * as core from '@actions/core'
import { type SummaryTableRow } from '@actions/core/lib/summary'
import { type GH2S3Transfer } from './github-to-s3-utils'
import { Octokit } from '@octokit/rest'

const headers: SummaryTableRow = [{ data: 'Asset', header: true }]

type WriteSummaryParams = {
  transfers: GH2S3Transfer[]
  getS3UrlForTransfer: (assetName: GH2S3Transfer) => string
  githubToken: string
  owner: string
  repo: string
  releaseId: number
}

export const writeActionSummary = async ({ transfers, getS3UrlForTransfer, githubToken, owner, repo, releaseId }: WriteSummaryParams): Promise<void> => {
  const octokit = new Octokit({ auth: githubToken })
  const release = await octokit.repos.getRelease({ owner, repo, release_id: releaseId })

  // Write summary
  core.summary.addHeading(`${transfers.length} release assets transferred from GitHub to S3`, 2)
  const tableData: SummaryTableRow[] = transfers.map(transfer => [`<a href="${getS3UrlForTransfer(transfer)}">${transfer.asset.name}</a>`])
  core.summary.addTable([headers, ...tableData])
  core.summary.addLink(`Release: ${release.data.tag_name}`, release.data.html_url)
  await core.summary.write()
}
