import { GH2S3Transfer } from './github-to-s3-utils'
import bytes from 'bytes'

const GET_RUST_TARGET_REGEX = /(?<assetName>^[^.]+)\./

type GroupedTransfers = Record<string, GH2S3Transfer[]>

const UPDATER_GROUP_NAME = 'Updater'

const rustTargetToHr: Record<string, string> = {
  'aarch64-apple-darwin': 'Apple Silicon',
  'x86_64-apple-darwin': 'Apple Intel',
  'universal-apple-darwin': 'Apple Universal',
  'aarch64-pc-windows-msvc': 'Windows ARM64',
  'i686-pc-windows-msvc': 'Windows 32-bit',
  'x86_64-pc-windows-msvc': 'Windows 64-bit',
  updater: UPDATER_GROUP_NAME,
}

const groupTransfers = (transfers: GH2S3Transfer[]) => {
  const unsortedGroupedTransfers = transfers.reduce((groups, transfer) => {
    const rustTarget: string = transfer.asset.name.match(GET_RUST_TARGET_REGEX)?.groups?.assetName || ''
    const groupName = rustTargetToHr[rustTarget] || rustTarget
    if (!groups[groupName]) {
      groups[groupName] = [transfer]
    } else {
      groups[groupName].push(transfer)
    }
    return groups
  }, {} as GroupedTransfers)

  // Sort groups alphabetically
  const groupedTransfers = sortObjectKeys(unsortedGroupedTransfers)

  // Put updater group at the end
  if (groupedTransfers[UPDATER_GROUP_NAME]) {
    const updaterAssets = groupedTransfers[UPDATER_GROUP_NAME]
    delete groupedTransfers[UPDATER_GROUP_NAME]
    groupedTransfers[UPDATER_GROUP_NAME] = updaterAssets
  }

  return groupedTransfers
}

const stripRustTarget = (transfer: GH2S3Transfer): string => (transfer.asset.name.endsWith('.json') ? transfer.asset.name : transfer.asset.name.replace(GET_RUST_TARGET_REGEX, ''))

const getTransferRowMarkdown = (transfer: GH2S3Transfer, getS3UrlForTransfer: (assetName: GH2S3Transfer) => string): string => `| [${stripRustTarget(transfer)}](${getS3UrlForTransfer(transfer)}) | ${bytes(transfer.size)} |`

const getTransferTableMarkdown = (groupName: string, transfers: GH2S3Transfer[], getS3UrlForTransfer: (assetName: GH2S3Transfer) => string): string => {
  const rows = transfers.map(t => getTransferRowMarkdown(t, getS3UrlForTransfer))
  return `
## ${groupName}
| Asset | Size |
| ----------- | --- |
${rows.join('\n')}`
}

export const getTransfersSummaryTablesMarkdown = (transfers: GH2S3Transfer[], getS3UrlForTransfer: (assetName: GH2S3Transfer) => string) => {
  const groupedTransfers = groupTransfers(transfers)
  const tables = Object.keys(groupedTransfers).map(groupName => getTransferTableMarkdown(groupName, groupedTransfers[groupName], getS3UrlForTransfer))
  return `${tables.join('\n\n')}`
}

const sortObjectKeys = <T>(obj: Record<string, T>): Record<string, T> => {
  return Object.keys(obj)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = obj[key]
        return acc
      },
      {} as Record<string, T>
    )
}
