import * as core from '@actions/core'
import { type SummaryTableRow } from '@actions/core/lib/summary'
import { GitHubReleaseAsset } from './github-to-s3-utils'
import { joinPaths, generateObjectUrlBase } from './s3-utils'

const headers: SummaryTableRow = [{ data: 'Asset', header: true }]

type WriteSummaryParams = {
  endpoint: string
  bucket: string
  folder: string
  assets: GitHubReleaseAsset[]
}

export const writeSummary = async ({ endpoint, bucket, folder, assets }: WriteSummaryParams): Promise<void> => {
  const objectUrlBase = generateObjectUrlBase(endpoint, bucket)
  // Write summary
  core.summary.addHeading(`${assets.length} release assets transferred from GitHub to S3`, 2)
  const tableData: SummaryTableRow[] = assets.map(asset => [`<a href="${joinPaths(objectUrlBase, folder, asset.name)}">${asset.name}</a>`])
  core.summary.addTable([headers, ...tableData])
  await core.summary.write()
}
