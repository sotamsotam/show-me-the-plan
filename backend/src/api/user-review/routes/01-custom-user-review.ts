export default {
  routes: [
    {
      method: 'GET',
      path: '/user-reviews',
      handler: 'user-review.findPublished',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/user-reviews/home-featured',
      handler: 'user-review.findHomeFeatured',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/user-reviews/mine',
      handler: 'user-review.findMine',
      config: {
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/user-reviews/ops',
      handler: 'user-review.findOps',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/user-reviews',
      handler: 'user-review.create',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-reviews/:id',
      handler: 'user-review.update',
      config: {
        auth: {},
      },
    },
    {
      method: 'DELETE',
      path: '/user-reviews/:id',
      handler: 'user-review.remove',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-reviews/:id/reply',
      handler: 'user-review.updateReply',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-reviews/:id/status',
      handler: 'user-review.updateStatus',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/user-reviews/:id/home-featured',
      handler: 'user-review.updateFeaturedOnHome',
      config: {
        auth: {},
      },
    },
  ],
};
