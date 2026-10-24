const lessonTypeDefs = `#graphql
    scalar DateTime
    scalar Upload

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
        # Units across all of this module's lessons
        unitCount: Int!
    }

    type Lesson {
        id: ID!
        moduleId:    Int
        module:      Module
        title:       String
        description: String
        sequence:    Int
        xpReward:    Int      
        status:      String   
        createdAt:   DateTime
        updatedAt:   DateTime

        units: [Unit!]
        unitCount: Int!
    }

    # One thing taught inside a lesson, e.g. "Letter M"
    type Unit {
        id: ID!
        lessonId:    Int
        lesson:      Lesson
        title:       String
        description: String
        sequence:    Int
        mediaRef:    String
        # Dictionary sign this unit teaches
        entryId:     Int
        # True when the unit has neither a video nor a linked sign yet
        needsVideo:  Boolean!
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
        units(limit: Int = 50, offset: Int = 0, search: String, status: String, lessonId: Int): [Unit!]!
        unit(id: ID!): Unit
    }

    extend type Mutation {
        saveLevel(input: levelInput!): ResponseMessage!
        saveModule(input: moduleInput!): ResponseMessage!
        saveLessons(input: lessonsInput!): ResponseMessage!
        saveUnit(input: unitInput!): ResponseMessage!
        deleteUnit(id: ID!): ResponseMessage!
    }

    input unitInput {
        id: ID
        lessonId:    Int
        title:       String
        description: String
        # Omit on create to put the unit at the end of the lesson
        sequence:    Int
        # New sign video for this unit; omit to keep the current one
        video:       Upload!
        entryId:     Int
        status:      String
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
        moduleId:    Int!
        title:       String!
        description: String
        sequence:    Int
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
        # lessons: [lessonsInput!] 
    }

    

`;

export default lessonTypeDefs;