# GitHub Assets to S3

GitHub action that transfers the assets of a GitHub release to S3.

## Example Usage

Using the release tag.

```yaml
- uses: ./.github/actions/upload-release-assets-to-s3
  with:
    endpoint: https://s3.us-east-1.amazonaws.com
    region: us-east-1
    accessKeyId: ${{ secrets.S3_ACCESS_KEY_ID }}
    secretAccessKey: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    bucket: your-bucket-name
    folder: your/optional/folder
    repository: ${{ github.repository }}
    releaseTag: your-release-tag
    githubToken: ${{ secrets.GITHUB_TOKEN }}
```

Using the release ID.

```yaml
- uses: ./.github/actions/upload-release-assets-to-s3
  with:
    endpoint: https://s3.us-east-1.amazonaws.com
    region: us-east-1
    accessKeyId: ${{ secrets.S3_ACCESS_KEY_ID }}
    secretAccessKey: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    bucket: your-bucket-name
    folder: your/optional/folder
    repository: ${{ github.repository }}
    releaseId: 123456
    githubToken: ${{ secrets.GITHUB_TOKEN }}
```

Note: Make sure you add appropriate permissions to the job, so it can read GitHub release assets:

```yaml
permissions:
  contents: 'read'
```

Important: If the draft you're trying to access is a "draft" release, you must use this permission even if you know in advance the release ID. Only using the 'read' permission will fail with a 403 error "Resource not accessible by
integration".

```yaml
permissions:
  contents: 'write'
```
