const TRIM_SLASHES_REGEX = /^\/+|\/+$/g

export const joinPaths = (...parts: string[]): string => {
  const validParts = parts.map(part => part.replace(TRIM_SLASHES_REGEX, '')).filter(Boolean)
  return validParts.join('/')
}

export const generateObjectUrlBase = (endpoint: string, bucket: string): string => {
  // Extract the protocol and domain from the endpoint
  const [protocol, domain] = endpoint.split('://')

  // Construct the objectUrlBase
  return `${protocol}://${bucket}.${domain}`
}
