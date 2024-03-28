// Import the function to test
import { joinPaths } from './s3-utils'

describe('createObjectName', () => {
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
  ]

  test.each(successCases)('correctly formats $pathParts into "$expected"', ({ pathParts, expected }) => {
    expect(joinPaths(...pathParts)).toBe(expected)
  })
})
