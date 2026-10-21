const lessonTypeDefs = `#graphql

    type Level {
        id: ID!
        name:        String   
        description: String
        difficulty:  String  
        sequence:    Int
        status:   String   
        createdAt:  DateTime 
        updatedAt: DateTime 

        modules: [Module!]
    }

    type Module {
        id: ID!
        levelId: Int
        level: Level    
        title:  String   
        description: String  
        sequence: Int
        xpReward: Int   
        requiresModuleId: Int
        requiresModule:   Module
        unlocks: [Module] 
        status:  String   
        createdAt: DateTime 
        updatedAt: DateTime

        lessons: [Lesson!]
    }

    type Lesson {
        id: ID!
        moduleId:    Int
        module:      Module 
        title:       String   
        description: String
        sequence:    Int
        mediaRef:    String
        xpReward:    Int      
        status:      String   
        createdAt:   DateTime 
        updatedAt:   DateTime 

    }

    extend type Query {
        levels(limit: Int = 20, offset: Int = 0, search: String, status: String): [Level!]!
        level(id: ID!): Level
        modules(limit: Int = 20, offset: Int = 0, search: String, status: String, levelId: Int): [Module!]!
        module(id: ID!): Module
        lessons(limit: Int = 20, offset: Int = 0, search: String, status: String, moduleId: Int): [Lesson!]!
        lesson(id: ID!): Lesson
    }

    extend type Mutation {
        saveLevel(input: levelInput!): ResponseMessage!
        saveModule(input: moduleInput!): ResponseMessage!
        saveLessons(input: lessonsInput!): ResponseMessage!
    }

    input levelInput {
        id: ID
        name:        String   
        description: String
        difficulty:  String  
        sequence:    Int
        status:   String   
    }

    input lessonsInput {
        id: ID
        # moduleId:    Int
        title:       String   
        description: String
        sequence:    Int
        mediaRef:    String
        xpReward:    Int      
        status:      String
    }

    input moduleInput{
        id: ID
        levelId: Int! 
        title:  String   
        description: String  
        sequence: Int
        xpReward: Int   
        # requiresModuleId: Int
        unlocks: [Int] 
        status:  String  
        lessons: [lessonsInput!] 
    }

    

`;

export default lessonTypeDefs;