const healthResolvers = {
  Query: {
    health: () => ({ success: true, message: "UGSL Learn Yoga server is running." }),
  },
};

export default healthResolvers;
