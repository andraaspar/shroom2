import { unproxify } from './proxify'
import {
	getEntries,
	type IUseQueryOptions,
	Status,
	type TLoadFn,
	useQuery,
} from './useQuery'

export interface IUseInfiniteQueryPage<T> {
	id: number
	value: T
}

export interface IUseInfiniteQueryData<T> {
	pages: IUseInfiniteQueryPage<T>[]
}

export interface IUseInfiniteQueryParam {
	page: number
}

export interface IUseInfiniteQueryHasMore {
	hasMore?: boolean
}

export type TUninfiniteParams<P> = Omit<P, 'page'>

export function useInfiniteQuery<
	T extends IUseInfiniteQueryHasMore,
	P extends IUseInfiniteQueryParam,
>(
	name: string,
	createOptions: () => IUseQueryOptions<T, P, TUninfiniteParams<P>>,
) {
	let options: IUseQueryOptions<T, P, TUninfiniteParams<P>> | undefined
	const result = useQuery(name, () => {
		const o = (options = createOptions())

		return {
			...o,
			load: (params) => loadData(o.key, o.load, params),
		}
	})
	return [
		result,
		{
			loadNextPage() {
				if (!options) {
					console.warn(`[t57hyk] loadNextPage called before options was ready.`)
					return
				}
				const entry = getEntries<
					IUseInfiniteQueryData<T>,
					TUninfiniteParams<P>
				>(options.key, options.params)[0]
				if (
					entry?.data &&
					(entry.status === Status.Loaded || entry.status === Status.Stale)
				) {
					entry.data.pages.length++
					entry.reload()
				}
			},
			hasNextPage() {
				return !!result.data?.pages.at(-1)?.value.hasMore
			},
		},
	] as const
}

async function loadData<
	T extends IUseInfiniteQueryHasMore,
	P extends IUseInfiniteQueryParam,
>(
	entryKey: string,
	loadPage: TLoadFn<T, P>,
	params: TUninfiniteParams<P>,
): Promise<IUseInfiniteQueryData<T>> {
	const entry = getEntries<IUseInfiniteQueryData<T>, TUninfiniteParams<P>>(
		entryKey,
		params,
	)[0]
	const pageCount = entry?.data?.pages.length ?? 1
	if (entry?.data?.pages && entry.data.pages.at(-1) == null) {
		const pages = unproxify(entry.data.pages).slice(0, -1)
		const value = await loadPage({ ...params, page: pages.length } as P)
		pages.push({ id: pages.length, value })
		return {
			pages,
		}
	} else {
		const pages: IUseInfiniteQueryPage<T>[] = []
		for (let page = 0; page < pageCount; page++) {
			const value = await loadPage({ ...params, page } as P)
			pages.push({ id: page, value })
			if (!value?.hasMore) {
				break
			}
		}
		return {
			pages,
		}
	}
}
