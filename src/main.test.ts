/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as main from './main'
import * as uploadModule from './upload-release-assets-to-s3'

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

// Mock the GitHub Actions core library
let debugMock: jest.SpiedFunction<typeof core.debug>
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>

// Mock upload module
let getReleaseIdByTagMock: jest.SpiedFunction<typeof uploadModule.getReleaseIdByTag>
let uploadReleaseAssetsToS3Mock: jest.SpiedFunction<typeof uploadModule.uploadReleaseAssetsToS3>

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    debugMock = jest.spyOn(core, 'debug').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
    getReleaseIdByTagMock = jest.spyOn(uploadModule, 'getReleaseIdByTag').mockResolvedValue(12345)
    uploadReleaseAssetsToS3Mock = jest.spyOn(uploadModule, 'uploadReleaseAssetsToS3').mockImplementation()
  })

  type TestInputs = {
    endpoint: string
    region: string
    accessKeyId: string
    secretAccessKey: string
    bucket: string
    repository: string
    releaseId: string
    releaseTag: string
    githubToken: string
  }

  type SuccessTestCase = {
    inputs: TestInputs
    expected: {
      callsTo_getReleaseIdByTagMock: number
    }
  }

  const successTestCases: SuccessTestCase[] = [
    {
      inputs: {
        endpoint: 'https://example.com',
        region: 'test-region',
        accessKeyId: 'test-accessKeyId',
        secretAccessKey: 'test-secretAccessKey',
        bucket: 'test-bucket',
        repository: 'the-owner/the-repo',
        releaseId: '67890', // Explicit release ID
        releaseTag: '', // No release tag
        githubToken: 'test-githubToken',
      },
      expected: {
        // Release ID is provided, not need find release id by tag
        callsTo_getReleaseIdByTagMock: 0,
      },
    },
    {
      inputs: {
        endpoint: 'https://example.com',
        region: 'test-region',
        accessKeyId: 'test-accessKeyId',
        secretAccessKey: 'test-secretAccessKey',
        bucket: 'test-bucket',
        repository: 'the-owner/the-repo',
        releaseId: '', // No release ID
        releaseTag: 'test-tag', // Demo release tag
        githubToken: 'test-githubToken',
      },
      expected: {
        // Only tag is provided, we find the release id using its tag
        callsTo_getReleaseIdByTagMock: 1,
      },
    },
  ]

  test.each(successTestCases)('Called with valid inputs $inputs runs successfully', async ({ inputs, expected }) => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => inputs[name as keyof TestInputs])

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify upload module was called correctly
    expect(getReleaseIdByTagMock).toHaveBeenCalledTimes(expected.callsTo_getReleaseIdByTagMock)

    expect(uploadReleaseAssetsToS3Mock).toHaveBeenCalledTimes(1)

    // Verify that core library functions were called correctly
    expect(debugMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
    expect(setFailedMock).not.toHaveBeenCalled()
    expect(setOutputMock).not.toHaveBeenCalled()
  })

  type FailureTestCase = {
    inputs: TestInputs
    expectedFailure: any
  }

  const failureTestCases: FailureTestCase[] = [
    {
      inputs: {
        endpoint: 'https://example.com',
        region: 'test-region',
        accessKeyId: 'test-accessKeyId',
        secretAccessKey: 'test-secretAccessKey',
        bucket: 'test-bucket',
        repository: 'the-owner-the-repo',
        releaseId: '11111', // Explicit release ID
        releaseTag: '', // No release tag
        githubToken: 'test-githubToken',
      },
      expectedFailure: 'The "repository" input must follow the format "owner/repo"',
    },
    {
      inputs: {
        endpoint: 'https://example.com',
        region: 'test-region',
        accessKeyId: 'test-accessKeyId',
        secretAccessKey: 'test-secretAccessKey',
        bucket: 'test-bucket',
        repository: 'the-owner/the-repo',
        releaseId: '', // No release ID
        releaseTag: '', // No release tag
        githubToken: 'test-githubToken',
      },
      expectedFailure: 'You must provide either the "releaseId" or the "releaseTag" input.',
    },
    {
      inputs: {
        endpoint: 'https://example.com',
        region: 'test-region',
        accessKeyId: 'test-accessKeyId',
        secretAccessKey: 'test-secretAccessKey',
        bucket: 'test-bucket',
        repository: 'the-owner/the-repo',
        releaseId: '11111', // Both ID and tag are provided
        releaseTag: 'test-tag', // Both ID and tag are provided
        githubToken: 'test-githubToken',
      },
      expectedFailure: 'You must provide only one either the "releaseId" or the "releaseTag" input but not both.',
    },
    {
      inputs: {
        endpoint: 'https://example.com',
        region: 'test-region',
        accessKeyId: 'test-accessKeyId',
        secretAccessKey: 'test-secretAccessKey',
        bucket: 'test-bucket',
        repository: 'the-owner/the-repo',
        releaseId: 'not-a-number', // Invalid ID
        releaseTag: '',
        githubToken: 'test-githubToken',
      },
      expectedFailure: 'When you provide "releaseId", it must be a number.',
    },
    {
      inputs: {
        endpoint: 'example.com', // Invalid protocol
        region: 'test-region',
        accessKeyId: 'test-accessKeyId',
        secretAccessKey: 'test-secretAccessKey',
        bucket: 'test-bucket',
        repository: 'the-owner/the-repo',
        releaseId: '11111',
        releaseTag: '',
        githubToken: 'test-githubToken',
      },
      expectedFailure: expect.stringMatching(/^The input "endpoint" must start with a valid protocol, like:/),
    },
    {
      inputs: {
        endpoint: 'http://example.com', // Insecure protocol must fail
        region: 'test-region',
        accessKeyId: 'test-accessKeyId',
        secretAccessKey: 'test-secretAccessKey',
        bucket: 'test-bucket',
        repository: 'the-owner/the-repo',
        releaseId: '11111',
        releaseTag: '',
        githubToken: 'test-githubToken',
      },
      expectedFailure: expect.stringMatching(/^The input "endpoint" must start with a valid protocol, like:/),
    },
  ]

  test.each(failureTestCases)('Called with invalid inputs $inputs must show correct error message', async ({ inputs, expectedFailure }) => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => inputs[name as keyof TestInputs])

    await main.run()
    expect(runMock).toHaveReturned()

    // Business logic function not called
    expect(getReleaseIdByTagMock).not.toHaveBeenCalled()
    expect(uploadReleaseAssetsToS3Mock).not.toHaveBeenCalled()

    // Verify correct error was shown
    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenNthCalledWith(1, expectedFailure)

    // Verify that core library functions were called correctly
    expect(debugMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
    expect(setOutputMock).not.toHaveBeenCalled()
  })
})
