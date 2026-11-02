export function accountListHref(page: number) {
  return page <= 1 ? "/records" : `/records?page=${page}`
}
