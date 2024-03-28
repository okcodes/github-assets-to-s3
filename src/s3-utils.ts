export const createObjectName = (folder: string, assetName: string): string => {
  // Trim leading and trailing slashes from the folder
  const normalizedFolder = folder.replace(/^\/+|\/+$/g, '')
  // Concatenate the folder and assetName with a slash, only if folder is not empty
  return normalizedFolder ? `${normalizedFolder}/${assetName}` : assetName
}

export const generateObjectUrlBase = (endpoint: string, bucket: string): string => {
  // Extract the protocol and domain from the endpoint
  const [protocol, domain] = endpoint.split('://')

  // Construct the objectUrlBase
  return `${protocol}://${bucket}.${domain}`
}
