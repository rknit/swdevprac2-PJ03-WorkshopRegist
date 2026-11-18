/**
 * @swagger
 * {
 *   "components": {
 *     "schemas": {
 *       "Error": {
 *         "type": "object",
 *         "properties": {
 *           "success": {
 *             "type": "boolean",
 *             "example": false
 *           },
 *           "error": {
 *             "type": "string"
 *           },
 *           "stack": {
 *             "type": "string",
 *             "description": "Included for global errors in development."
 *           }
 *         }
 *       },
 *       "User": {
 *         "type": "object",
 *         "properties": {
 *           "_id": {
 *             "type": "string",
 *             "pattern": "^[a-fA-F0-9]{24}$",
 *             "example": "507f1f77bcf86cd799439011"
 *           },
 *           "name": {
 *             "type": "string"
 *           },
 *           "email": {
 *             "type": "string",
 *             "format": "email"
 *           },
 *           "tel": {
 *             "type": "string"
 *           },
 *           "role": {
 *             "type": "string",
 *             "enum": [
 *               "member",
 *               "admin"
 *             ]
 *           },
 *           "activeSeats": {
 *             "type": "integer",
 *             "minimum": 0,
 *             "description": "Only in GET /api/v1/users. Live count of the user's registrations on active workshops (today or later, not deleted)."
 *           },
 *           "createdAt": {
 *             "type": "string",
 *             "format": "date-time"
 *           }
 *         }
 *       },
 *       "RegisterInput": {
 *         "type": "object",
 *         "properties": {
 *           "name": {
 *             "type": "string"
 *           },
 *           "email": {
 *             "type": "string",
 *             "format": "email"
 *           },
 *           "tel": {
 *             "type": "string"
 *           },
 *           "password": {
 *             "type": "string",
 *             "minLength": 6,
 *             "format": "password"
 *           },
 *           "role": {
 *             "type": "string",
 *             "enum": [
 *               "member",
 *               "admin"
 *             ],
 *             "default": "member"
 *           }
 *         },
 *         "required": [
 *           "name",
 *           "email",
 *           "tel",
 *           "password"
 *         ]
 *       },
 *       "LoginInput": {
 *         "type": "object",
 *         "properties": {
 *           "email": {
 *             "type": "string",
 *             "format": "email"
 *           },
 *           "password": {
 *             "type": "string",
 *             "format": "password"
 *           }
 *         },
 *         "required": [
 *           "email",
 *           "password"
 *         ]
 *       },
 *       "AuthResponse": {
 *         "type": "object",
 *         "properties": {
 *           "success": {
 *             "type": "boolean",
 *             "example": true
 *           },
 *           "data": {
 *             "type": "object",
 *             "properties": {
 *               "id": {
 *                 "type": "string",
 *                 "pattern": "^[a-fA-F0-9]{24}$",
 *                 "example": "507f1f77bcf86cd799439011"
 *               },
 *               "name": {
 *                 "type": "string"
 *               },
 *               "email": {
 *                 "type": "string",
 *                 "format": "email"
 *               },
 *               "role": {
 *                 "type": "string",
 *                 "enum": [
 *                   "member",
 *                   "admin"
 *                 ]
 *               },
 *               "token": {
 *                 "type": "string",
 *                 "description": "JWT; use with the Authorize button as a bearer token."
 *               }
 *             }
 *           }
 *         }
 *       },
 *       "EmptyResponse": {
 *         "type": "object",
 *         "properties": {
 *           "success": {
 *             "type": "boolean",
 *             "example": true
 *           },
 *           "data": {
 *             "type": "object",
 *             "example": {}
 *           }
 *         }
 *       },
 *       "WorkshopInput": {
 *         "type": "object",
 *         "properties": {
 *           "name": {
 *             "type": "string",
 *             "example": "Introduction to Photography"
 *           },
 *           "description": {
 *             "type": "string",
 *             "example": "Learn practical camera skills"
 *           },
 *           "instructor": {
 *             "type": "string",
 *             "example": "Example Instructor"
 *           },
 *           "workshopDate": {
 *             "type": "string",
 *             "format": "date",
 *             "description": "Real calendar date in YYYY-MM-DD format; today or later in UTC."
 *           },
 *           "coverImage": {
 *             "type": "string",
 *             "nullable": true,
 *             "format": "uri",
 *             "example": "https://picsum.photos/id/1/1200/600",
 *             "description": "Optional banner image URL (http or https, at most 2048 characters). Send null or an empty string to clear it."
 *           },
 *           "endTime": {
 *             "type": "string",
 *             "nullable": true,
 *             "example": "16:00",
 *             "description": "Optional end time in HH:mm (24-hour), Asia/Bangkok time. Needs a startTime and must be later than it."
 *           },
 *           "startTime": {
 *             "type": "string",
 *             "nullable": true,
 *             "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$",
 *             "example": "13:00",
 *             "description": "Optional start time in HH:mm (24-hour), Asia/Bangkok time. Send null or an empty string to clear it."
 *           },
 *           "location": {
 *             "type": "string",
 *             "example": "Training room A"
 *           },
 *           "capacity": {
 *             "type": "integer",
 *             "minimum": 1,
 *             "example": 20
 *           }
 *         },
 *         "required": [
 *           "name",
 *           "description",
 *           "instructor",
 *           "workshopDate",
 *           "location",
 *           "capacity"
 *         ]
 *       },
 *       "WorkshopUpdate": {
 *         "type": "object",
 *         "properties": {
 *           "name": {
 *             "type": "string",
 *             "example": "Introduction to Photography"
 *           },
 *           "description": {
 *             "type": "string",
 *             "example": "Learn practical camera skills"
 *           },
 *           "instructor": {
 *             "type": "string",
 *             "example": "Example Instructor"
 *           },
 *           "workshopDate": {
 *             "type": "string",
 *             "format": "date",
 *             "description": "Real calendar date in YYYY-MM-DD format; today or later in UTC."
 *           },
 *           "coverImage": {
 *             "type": "string",
 *             "nullable": true,
 *             "format": "uri",
 *             "example": "https://picsum.photos/id/1/1200/600",
 *             "description": "Optional banner image URL (http or https, at most 2048 characters). Send null or an empty string to clear it."
 *           },
 *           "endTime": {
 *             "type": "string",
 *             "nullable": true,
 *             "example": "16:00",
 *             "description": "Optional end time in HH:mm (24-hour), Asia/Bangkok time. Needs a startTime and must be later than it."
 *           },
 *           "startTime": {
 *             "type": "string",
 *             "nullable": true,
 *             "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$",
 *             "example": "13:00",
 *             "description": "Optional start time in HH:mm (24-hour), Asia/Bangkok time. Send null or an empty string to clear it."
 *           },
 *           "location": {
 *             "type": "string",
 *             "example": "Training room A"
 *           },
 *           "capacity": {
 *             "type": "integer",
 *             "minimum": 1,
 *             "example": 20
 *           }
 *         }
 *       },
 *       "Workshop": {
 *         "type": "object",
 *         "properties": {
 *           "_id": {
 *             "type": "string",
 *             "pattern": "^[a-fA-F0-9]{24}$",
 *             "example": "507f1f77bcf86cd799439011"
 *           },
 *           "name": {
 *             "type": "string",
 *             "example": "Introduction to Photography"
 *           },
 *           "description": {
 *             "type": "string",
 *             "example": "Learn practical camera skills"
 *           },
 *           "instructor": {
 *             "type": "string",
 *             "example": "Example Instructor"
 *           },
 *           "workshopDate": {
 *             "type": "string",
 *             "format": "date-time"
 *           },
 *           "startTime": {
 *             "type": "string",
 *             "nullable": true,
 *             "example": "13:00"
 *           },
 *           "endTime": {
 *             "type": "string",
 *             "nullable": true,
 *             "example": "16:00"
 *           },
 *           "coverImage": {
 *             "type": "string",
 *             "nullable": true,
 *             "format": "uri"
 *           },
 *           "location": {
 *             "type": "string",
 *             "example": "Training room A"
 *           },
 *           "capacity": {
 *             "type": "integer",
 *             "minimum": 1,
 *             "example": 20
 *           },
 *           "isActive": {
 *             "type": "boolean",
 *             "default": true
 *           },
 *           "createdAt": {
 *             "type": "string",
 *             "format": "date-time"
 *           },
 *           "updatedAt": {
 *             "type": "string",
 *             "format": "date-time"
 *           }
 *         }
 *       },
 *       "RegistrationInput": {
 *         "type": "object",
 *         "properties": {
 *           "workshop": {
 *             "type": "string",
 *             "pattern": "^[a-fA-F0-9]{24}$",
 *             "example": "507f1f77bcf86cd799439011"
 *           },
 *           "user": {
 *             "type": "string",
 *             "pattern": "^[a-fA-F0-9]{24}$",
 *             "description": "Admin only, required for an admin: the member to register."
 *           },
 *           "ignoreCapacity": {
 *             "type": "boolean",
 *             "default": false,
 *             "description": "Admin only (403 for a member). true takes a seat even when the workshop is full. The duplicate, past-date, and 3-active rules still apply."
 *           }
 *         },
 *         "required": [
 *           "workshop"
 *         ]
 *       },
 *       "RegistrationUpdate": {
 *         "type": "object",
 *         "properties": {
 *           "note": {
 *             "type": "string",
 *             "maxLength": 300,
 *             "description": "Free-text note. The owner member (upcoming registrations only) or an admin can set it."
 *           },
 *           "attendance": {
 *             "type": "string",
 *             "enum": ["registered", "attended", "no-show"],
 *             "description": "Admin only (403 for a member), from the workshop day on. Never returned to members."
 *           }
 *         },
 *         "description": "Edit the note and attendance. A registration cannot move to another workshop: sending workshop returns 400. Delete it and register again."
 *       },
 *       "Registration": {
 *         "type": "object",
 *         "properties": {
 *           "_id": {
 *             "type": "string",
 *             "pattern": "^[a-fA-F0-9]{24}$",
 *             "example": "507f1f77bcf86cd799439011"
 *           },
 *           "workshop": {
 *             "$ref": "#/components/schemas/Workshop"
 *           },
 *           "user": {
 *             "$ref": "#/components/schemas/User"
 *           },
 *           "createdAt": {
 *             "type": "string",
 *             "format": "date-time"
 *           },
 *           "updatedAt": {
 *             "type": "string",
 *             "format": "date-time"
 *           }
 *         }
 *       }
 *     },
 *     "parameters": {
 *       "ResourceId": {
 *         "name": "id",
 *         "in": "path",
 *         "required": true,
 *         "description": "MongoDB document ID.",
 *         "schema": {
 *           "type": "string",
 *           "pattern": "^[a-fA-F0-9]{24}$",
 *           "example": "507f1f77bcf86cd799439011"
 *         }
 *       }
 *     },
 *     "responses": {
 *       "Error400": {
 *         "description": "Invalid request input.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/Error"
 *             }
 *           }
 *         }
 *       },
 *       "Error401": {
 *         "description": "Missing or invalid credentials, or user no longer exists.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/Error"
 *             }
 *           }
 *         }
 *       },
 *       "Error403": {
 *         "description": "Role or ownership does not permit this operation.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/Error"
 *             }
 *           }
 *         }
 *       },
 *       "Error404": {
 *         "description": "Resource not found or inactive.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/Error"
 *             }
 *           }
 *         }
 *       },
 *       "Error429": {
 *         "description": "Rate limit exceeded (100 requests per IP per 10 minutes).",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/Error"
 *             }
 *           }
 *         }
 *       },
 *       "Error500": {
 *         "description": "Server error. Current global handling also returns this for Mongoose validation, cast, and duplicate-key errors.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/Error"
 *             }
 *           }
 *         }
 *       },
 *       "Error409": {
 *         "description": "Duplicate registration, full workshop, active registration limit, or conflicting workshop change.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/Error"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/api/v1/auth/register": {
 *     "post": {
 *       "tags": [
 *         "Authentication"
 *       ],
 *       "summary": "Register a user",
 *       "description": "Public registration accepts member or admin roles and issues a JWT in data.token and an HTTP-only token cookie.",
 *       "security": [],
 *       "responses": {
 *         "201": {
 *           "description": "Successful operation.",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "$ref": "#/components/schemas/AuthResponse"
 *               }
 *             }
 *           },
 *           "headers": {
 *             "Set-Cookie": {
 *               "description": "HTTP-only token cookie; Secure in production.",
 *               "schema": {
 *                 "type": "string"
 *               }
 *             }
 *           }
 *         },
 *         "429": {
 *           "$ref": "#/components/responses/Error429"
 *         },
 *         "500": {
 *           "$ref": "#/components/responses/Error500"
 *         }
 *       },
 *       "requestBody": {
 *         "required": true,
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/RegisterInput"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/api/v1/auth/login": {
 *     "post": {
 *       "tags": [
 *         "Authentication"
 *       ],
 *       "summary": "Log in",
 *       "description": "Issues a JWT in data.token and an HTTP-only token cookie.",
 *       "security": [],
 *       "responses": {
 *         "200": {
 *           "description": "Successful operation.",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "$ref": "#/components/schemas/AuthResponse"
 *               }
 *             }
 *           },
 *           "headers": {
 *             "Set-Cookie": {
 *               "description": "HTTP-only token cookie; Secure in production.",
 *               "schema": {
 *                 "type": "string"
 *               }
 *             }
 *           }
 *         },
 *         "400": {
 *           "$ref": "#/components/responses/Error400"
 *         },
 *         "401": {
 *           "$ref": "#/components/responses/Error401"
 *         },
 *         "429": {
 *           "$ref": "#/components/responses/Error429"
 *         },
 *         "500": {
 *           "$ref": "#/components/responses/Error500"
 *         }
 *       },
 *       "requestBody": {
 *         "required": true,
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/LoginInput"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/api/v1/auth/me": {
 *     "get": {
 *       "tags": [
 *         "Authentication"
 *       ],
 *       "summary": "Get current user",
 *       "description": "Returns the authenticated user profile without the password.",
 *       "security": [
 *         {
 *           "bearerAuth": []
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Successful operation.",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "type": "object",
 *                 "properties": {
 *                   "success": {
 *                     "type": "boolean",
 *                     "example": true
 *                   },
 *                   "data": {
 *                     "$ref": "#/components/schemas/User"
 *                   }
 *                 }
 *               }
 *             }
 *           }
 *         },
 *         "401": {
 *           "$ref": "#/components/responses/Error401"
 *         },
 *         "429": {
 *           "$ref": "#/components/responses/Error429"
 *         },
 *         "500": {
 *           "$ref": "#/components/responses/Error500"
 *         }
 *       }
 *     }
 *   },
 *   "/api/v1/auth/logout": {
 *     "get": {
 *       "tags": [
 *         "Authentication"
 *       ],
 *       "summary": "Log out",
 *       "description": "Replaces the token cookie with none and a short expiry. Existing bearer tokens remain valid until they expire.",
 *       "security": [
 *         {
 *           "bearerAuth": []
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Successful operation.",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "$ref": "#/components/schemas/EmptyResponse"
 *               }
 *             }
 *           }
 *         },
 *         "401": {
 *           "$ref": "#/components/responses/Error401"
 *         },
 *         "429": {
 *           "$ref": "#/components/responses/Error429"
 *         },
 *         "500": {
 *           "$ref": "#/components/responses/Error500"
 *         }
 *       }
 *     }
 *   }
 * }
 */
const express = require("express");
const { register, login, getMe, logout } = require("../controllers/auth");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/logout", protect, logout);

module.exports = router;
