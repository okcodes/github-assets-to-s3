import * as core from '@actions/core'
import { type SummaryTableRow } from '@actions/core/lib/summary'
import { type GH2S3Transfer } from './github-to-s3-utils'

const headers: SummaryTableRow = [{ data: 'Asset', header: true }]

type WriteSummaryParams = {
  transfers: GH2S3Transfer[]
  getS3UrlForTransfer: (assetName: GH2S3Transfer) => string
}

export const writeSummary = async ({ transfers, getS3UrlForTransfer }: WriteSummaryParams): Promise<void> => {
  // Write summary
  core.summary.addHeading(`${transfers.length} release assets transferred from GitHub to S3`, 2)
  const tableData: SummaryTableRow[] = transfers.map(transfer => [`<a href="${getS3UrlForTransfer(transfer)}">${transfer.asset.name}</a>`])
  core.summary.addTable([headers, ...tableData])
  await core.summary.write()
}
