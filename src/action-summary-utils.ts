import * as core from '@actions/core'
import { type SummaryTableRow } from '@actions/core/lib/summary'
import { GitHubReleaseAsset } from './github-to-s3-utils'

const headers: SummaryTableRow = [{ data: 'Asset', header: true }]

type WriteSummaryParams = {
  assets: GitHubReleaseAsset[]
  region: string
  bucket: string
  s3UrlTemplate: string
  releaseId: number
}

export const writeSummary = async ({ assets, bucket, region, s3UrlTemplate, releaseId }: WriteSummaryParams): Promise<void> => {
  // Write summary
  core.summary.addHeading(`${assets.length} release assets transferred from GitHub to S3`, 2)
  const tableData: SummaryTableRow[] = assets.map(asset => [`<a href="${getUrl({ region, bucket, template: s3UrlTemplate, filename: asset.name })}">${asset.name}</a>`])
  core.summary.addTable([headers, ...tableData])
  await core.summary.write()
  console.log('Did transfer from GitHub to S3', releaseId)
}

const getUrl = ({ bucket, region, filename, template }: { bucket: string; region: string; filename: string; template: string }): string =>
  template
    .replaceAll(/\{BUCKET}/gi, bucket)
    .replaceAll(/\{REGION}/gi, region)
    .replaceAll(/\{FILENAME}/gi, filename)
