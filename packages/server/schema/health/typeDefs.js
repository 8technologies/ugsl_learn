const healthTypeDefs = `#graphql
  extend type Query {
    health: ResponseMessage!
  }
`;

export default healthTypeDefs;
