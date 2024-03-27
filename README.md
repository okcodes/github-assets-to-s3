# GitHub Assets to S3

GitHub action that transfers the assets of a GitHub release to S3.

## Example Usage

Using the release tag.

```yaml
- uses: ./.github/actions/upload-release-assets-to-s3
  with:
    endpoint: https://s3.us-east-000.backblazeb2.com
    region: us-east-000
    accessKeyId: ${{ secrets.S3_ACCESS_KEY_ID }}
    secretAccessKey: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    bucket: your-bucket-name
    repository: ${{ github.repository }}
    releaseTag: your-release-tag
    githubToken: ${{ secrets.GITHUB_TOKEN }}
    s3UrlTemplate: https://{BUCKET}.s3.{REGION}.backblazeb2.com/${FILENAME}
```

Using the release ID.

```yaml
- uses: ./.github/actions/upload-release-assets-to-s3
  with:
    endpoint: https://s3.us-east-000.backblazeb2.com
    region: us-east-000
    accessKeyId: ${{ secrets.S3_ACCESS_KEY_ID }}
    secretAccessKey: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    bucket: your-bucket-name
    repository: ${{ github.repository }}
    releaseId: 123456
    githubToken: ${{ secrets.GITHUB_TOKEN }}
    s3UrlTemplate: https://{BUCKET}.s3.{REGION}.backblazeb2.com/${FILENAME}
```

Note: Make sure you add appropriate permissions to the job, so it can read GitHub release assets:

```yaml
permissions:
  contents: 'read'
```
