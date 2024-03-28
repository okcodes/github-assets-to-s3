// Import the function to test
import { generateObjectUrlBase, joinPaths } from './s3-utils'

describe('joinPaths', () => {
  type SuccessCase = {
    pathParts: string[]
    expected: string
  }

  const successCases: SuccessCase[] = [
    {
      pathParts: ['my-folder', 'my-asset.png'],
      expected: 'my-folder/my-asset.png',
    },
    {
      pathParts: ['/my-folder', 'my-asset.png'],
      expected: 'my-folder/my-asset.png',
    },
    {
      pathParts: ['my-folder/', 'my-asset.png'],
      expected: 'my-folder/my-asset.png',
    },
    {
      pathParts: ['/my-folder/', 'my-asset.png'],
      expected: 'my-folder/my-asset.png',
    },
    {
      pathParts: ['/my/folder', 'my-asset.png'],
      expected: 'my/folder/my-asset.png',
    },
    {
      pathParts: ['', 'my-asset.png'], // Case with empty folder
      expected: 'my-asset.png',
    },
    {
      pathParts: ['/', 'my-asset.png'], // Case with folder being just a slash
      expected: 'my-asset.png',
    },
    {
      pathParts: ['///my/folder///', '///x/y///', '///my-asset.png///'], // Case with lots of slashes
      expected: 'my/folder/x/y/my-asset.png',
    },
    {
      pathParts: ['///https://example.com///', '///my/folder///', '///my-asset.png///'], // Case joining URLs with leading and trailing slashes.
      expected: 'https://example.com/my/folder/my-asset.png',
    },
  ]

  test.each(successCases)('correctly formats $pathParts into "$expected"', ({ pathParts, expected }) => {
    expect(joinPaths(...pathParts)).toBe(expected)
  })
})

describe('generateObjectUrlBase', () => {
  type SuccessCase = {
    endpoint: string
    bucket: string
    expected: string
  }

  const successCases: SuccessCase[] = [
    {
      endpoint: 'https://s3.us-east-1.amazonaws.com',
      bucket: 'my-bucket',
      expected: 'https://my-bucket.s3.us-east-1.amazonaws.com',
    },
    {
      endpoint: 'https://s3.eu-west-1.amazonaws.com',
      bucket: 'test-bucket',
      expected: 'https://test-bucket.s3.eu-west-1.amazonaws.com',
    },
    {
      endpoint: 'https://s3.amazonaws.com',
      bucket: 'another-bucket',
      expected: 'https://another-bucket.s3.amazonaws.com',
    },
    {
      endpoint: 'https://s3.us-east-005.backblazeb2.com',
      bucket: 'elephant-bucket',
      expected: 'https://elephant-bucket.s3.us-east-005.backblazeb2.com',
    },
  ]

  test.each(successCases)('should correctly generate object URL base for endpoint "$endpoint" and bucket "$bucket"', ({ endpoint, bucket, expected }) => {
    expect(generateObjectUrlBase(endpoint, bucket)).toBe(expected)
  })
})
