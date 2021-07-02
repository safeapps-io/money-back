const fullpathAdminUrl =
  `${process.env.SITE_SCHEME}://${process.env.SITE_ADMIN_HOST}` +
  (process.env.SITE_ADMIN_PORT ? `:${process.env.SITE_ADMIN_PORT}` : '')

export const userAdminPath = (id: string) => fullpathAdminUrl + `/users/${id}`,
  feedbackAdminPath = (id: string) => fullpathAdminUrl + `/feedback?q=${id}`
