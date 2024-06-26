import { Octokit, type RestEndpointMethodTypes } from '@octokit/rest'

type GitHubRelease = RestEndpointMethodTypes['repos']['listReleases']['response']['data'][number]

export const getReleaseIdByTag = async ({ githubToken, owner, repo, tag }: { githubToken: string; owner: string; repo: string; tag: string }): Promise<number> => {
  console.log(`Will get ID of release by tag "${tag}".`)
  const octokit = new Octokit({ auth: githubToken })
  try {
    console.log('Will get release by tag', { owner, repo, tag })
    const publishedRelease = await octokit.rest.repos.getReleaseByTag({ owner, repo, tag })
    console.log('Did get release by tag', { owner, repo, tag })
    return publishedRelease.data.id
  } catch (error) {
    // If error is not 404, it's an unknown error.
    if ((error as { status: number }).status !== 404) {
      console.error('Unexpected error getting release by tag', { owner, repo, tag, error })
      throw new Error(`Unexpected error getting GitHub release by tag "${tag}": ${(error as Error).message}`, { cause: error })
    }
    console.log('Release by ID not found', { owner, repo, tag, error })
    // If received 404 error, we can still try to find the release by looping through all the releases.
    const draftRelease = await getDraftReleaseByTag({ tag, repo, owner, octokit })
    if (!draftRelease) {
      // If after looping through all releases, none is found, throw.
      throw new Error(`Release with "${tag}" was not found in the published and draft releases.`)
    }
    return draftRelease.id
  }
}

const getDraftReleaseByTag = async ({ tag, repo, octokit, owner }: { octokit: Octokit; tag: string; repo: string; owner: string }): Promise<GitHubRelease | undefined> => {
  let page = 1
  let hasNextPage = true

  console.log('Get draft release by tag loop started', { owner, repo, tag })
  while (hasNextPage) {
    console.log('Will list releases', { owner, repo, tag, page })
    const releases = await octokit.repos.listReleases({ owner, repo, per_page: 100, page })
    console.log('Did list releases', { owner, repo, tag, page })
    const foundRelease = releases.data.find(_ => _.tag_name === tag)
    console.log('Filtered release', { owner, repo, tag, foundRelease })
    if (foundRelease) {
      return foundRelease
    }
    hasNextPage = releases.headers?.link?.includes('rel="next"') || false
    console.log('Release with tag not found.', { owner, repo, tag, page, hasNextPage })
    if (hasNextPage) {
      page++
    }
  }

  return void 0
}
