# mymind API OpenAPI Specification

Source reviewed: `https://access.mymind.com/api` and every linked API docs page in the sidebar on 2026-05-07.

Scope: public mymind API surface documented under `/api`, including current resource/tool endpoints, headers, rate-limit metadata, errors, base schemas, supported formats, and WIP entity/versioning notes. The API is alpha/beta and docs explicitly warn that unpinned/latest behavior may change.

```yaml
openapi: 3.1.0
info:
  title: mymind API
  version: "0.4.0-alpha"
  summary: Private API for saving, retrieving, organizing, searching, and converting mymind objects.
  description: |
    The mymind API uses signed per-request JWT bearer tokens. Objects are saved URLs,
    notes, images, documents, videos, or files. Objects can have tags, spaces, notes,
    content, blobs, screenshots, and AI-generated metadata.
  termsOfService: https://access.mymind.com/api/terms
servers:
  - url: https://api.mymind.com
security:
  - signedJwt: []
tags:
  - name: Objects
  - name: Spaces
  - name: Tags
  - name: Search
  - name: Convert
  - name: Entities
  - name: System

paths:
  /objects:
    get:
      tags: [Objects]
      summary: List objects
      description: |
        Returns objects accessible to the authenticated key. If `q` is present, search
        semantics and search credit costs apply. Deleted objects are excluded.
      operationId: listObjects
      x-credit-cost: "1-250"
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - name: q
          in: query
          schema: { type: string }
          description: Search query using the same syntax as `/search`.
        - name: id
          in: query
          schema: { type: array, items: { $ref: "#/components/schemas/Uid" } }
          style: form
          explode: true
          description: Repeatable object IDs to fetch, e.g. `?id=a&id=b`.
        - name: spaceId
          in: query
          schema: { $ref: "#/components/schemas/Uid" }
          description: Restrict results to objects in one space.
        - name: similarTo
          in: query
          schema: { $ref: "#/components/schemas/Uid" }
          description: Return related objects ranked by similarity. Mastermind only.
        - name: contentAs
          in: query
          schema:
            type: string
            enum: [text/markdown]
          description: Convert returned object content to this format.
        - name: limit
          in: query
          schema: { type: integer, default: 10000, maximum: 10000, minimum: 1 }
          description: Max results. Search queries are capped at 1000.
      responses:
        "200":
          description: Objects sorted by recency/relevance.
          headers: { RateLimit-Policy: { $ref: "#/components/headers/RateLimitPolicy" }, RateLimit: { $ref: "#/components/headers/RateLimit" }, RateLimit-Cost: { $ref: "#/components/headers/RateLimitCost" } }
          content:
            application/json:
              schema:
                type: array
                items: { $ref: "#/components/schemas/Object" }
        default: { $ref: "#/components/responses/Problem" }
    post:
      tags: [Objects]
      summary: Create an object
      description: |
        Creates an object from exactly one of `url`, `content`, or multipart `blob`.
        Duplicate URL/content/blob saves return the existing object, refresh `bumped`,
        and respond with 200 instead of 201.
      operationId: createObject
      x-credit-cost: "10-250"
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              description: "Create from exactly one of `url` or `content`; multipart creation uses `blob` plus metadata."
              properties:
                title: { type: string }
                spaces:
                  type: array
                  items: { $ref: "#/components/schemas/ObjectSpace" }
                tags:
                  type: array
                  items: { $ref: "#/components/schemas/ObjectTag" }
                content:
                  description: Plain string or structured Content object.
                url: { $ref: "#/components/schemas/Url" }
              additionalProperties: true
          multipart/form-data:
            schema:
              type: object
              required: [metadata, blob]
              properties:
                metadata:
                  description: JSON metadata matching CreateObjectRequest without `url` or `content`.
                  type: string
                blob:
                  type: string
                  format: binary
                  description: Uploaded file bytes. Max 64 MB.
      responses:
        "200":
          description: Existing duplicate object was bumped.
          content: { application/json: { schema: { $ref: "#/components/schemas/Object" } } }
        "201":
          description: Object created.
          content: { application/json: { schema: { $ref: "#/components/schemas/Object" } } }
        "400": { $ref: "#/components/responses/Problem" }
        "413": { $ref: "#/components/responses/Problem" }
        "415": { $ref: "#/components/responses/Problem" }
        default: { $ref: "#/components/responses/Problem" }

  /objects/{id}:
    get:
      tags: [Objects]
      summary: Get an object
      operationId: getObject
      x-credit-cost: 1
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectId"
        - name: contentAs
          in: query
          schema: { type: string, enum: [text/markdown] }
          description: Convert returned object content to this format.
      responses:
        "200": { description: Object, content: { application/json: { schema: { $ref: "#/components/schemas/Object" } } } }
        "404": { $ref: "#/components/responses/Problem" }
        default: { $ref: "#/components/responses/Problem" }
    patch:
      tags: [Objects]
      summary: Update object metadata
      operationId: updateObject
      x-credit-cost: 2
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              additionalProperties: false
              properties:
                title: { type: string }
                summary: { type: string, description: User-editable summary. }
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        "404": { $ref: "#/components/responses/Problem" }
        default: { $ref: "#/components/responses/Problem" }
    delete:
      tags: [Objects]
      summary: Delete an object
      description: Soft-deletes an object. Deleted objects are recoverable for 30 days.
      operationId: deleteObject
      x-credit-cost: 1
      x-idempotent: true
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectId"
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        default: { $ref: "#/components/responses/Problem" }

  /objects/{id}/blob:
    get:
      tags: [Objects]
      summary: Get object blob
      description: Returns original uploaded bytes for single-blob objects. May return 302 to a signed CDN URL.
      operationId: getObjectBlob
      x-credit-cost: 1
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectId"
      responses:
        "200": { description: Original blob bytes, content: { "*/*": { schema: { type: string, format: binary } } } }
        "302": { description: Redirect to signed CDN URL, headers: { Location: { schema: { type: string, format: uri } } } }
        "422": { $ref: "#/components/responses/Problem" }
        default: { $ref: "#/components/responses/Problem" }

  /objects/{id}/content:
    get:
      tags: [Objects]
      summary: Get object content
      description: Returns text-based object content in native or requested format.
      operationId: getObjectContent
      x-credit-cost: 1
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectId"
        - name: Accept
          in: header
          schema: { $ref: "#/components/schemas/TextFormat" }
          description: Omit for native format.
      responses:
        "200":
          description: Content body.
          content:
            text/plain: { schema: { type: string } }
            text/markdown: { schema: { type: string } }
            text/html: { schema: { type: string } }
            application/prose+json: { schema: { $ref: "#/components/schemas/Prose" } }
        "406": { $ref: "#/components/responses/Problem" }
        "422": { $ref: "#/components/responses/Problem" }
        default: { $ref: "#/components/responses/Problem" }
    put:
      tags: [Objects]
      summary: Update object content
      description: Full-replaces the content body of a Note object. Returns 422 for other object types.
      operationId: updateObjectContent
      x-credit-cost: 20
      x-idempotent: true
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectId"
      requestBody:
        required: true
        content:
          text/markdown: { schema: { type: string } }
          application/prose+json: { schema: { $ref: "#/components/schemas/Prose" } }
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        "422": { $ref: "#/components/responses/Problem" }
        default: { $ref: "#/components/responses/Problem" }

  /objects/{id}/screenshot:
    get:
      tags: [Objects]
      summary: Get object screenshot
      description: Returns screenshot bytes captured at save time. May return 302 to a signed CDN URL.
      operationId: getObjectScreenshot
      x-credit-cost: 1
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectId"
      responses:
        "200": { description: Screenshot image bytes, content: { "image/*": { schema: { type: string, format: binary } } } }
        "302": { description: Redirect to signed CDN URL, headers: { Location: { schema: { type: string, format: uri } } } }
        "422": { $ref: "#/components/responses/Problem" }
        default: { $ref: "#/components/responses/Problem" }

  /objects/{id}/thumbnail:
    get:
      tags: [Objects]
      summary: Get object thumbnail
      operationId: getObjectThumbnail
      x-credit-cost: 1
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectId"
        - name: size
          in: query
          schema: { type: string, examples: ["100x100"] }
          description: "Bounding box as WxH. Preserves aspect ratio like `object-fit: contain`."
      responses:
        "200": { description: Thumbnail bytes, content: { "image/*": { schema: { type: string, format: binary } } } }
        "302": { description: Redirect to signed CDN URL, headers: { Location: { schema: { type: string, format: uri } } } }
        default: { $ref: "#/components/responses/Problem" }

  /objects/{objectId}/notes:
    post:
      tags: [Objects]
      summary: Create an object note
      description: Appends a note. API stores up to 100 notes, but the app currently surfaces only `notes[0]`.
      operationId: createObjectNote
      x-credit-cost: 10
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectIdAsObjectId"
      requestBody:
        required: true
        content:
          text/markdown: { schema: { type: string } }
          application/prose+json: { schema: { $ref: "#/components/schemas/Prose" } }
      responses:
        "201":
          description: Note created.
          content:
            application/json:
              schema:
                type: object
                required: [id]
                properties: { id: { $ref: "#/components/schemas/Uid" } }
        default: { $ref: "#/components/responses/Problem" }

  /objects/{objectId}/notes/{noteId}:
    put:
      tags: [Objects]
      summary: Update an object note
      description: Full-replaces an existing note body.
      operationId: updateObjectNote
      x-credit-cost: 10
      x-idempotent: true
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectIdAsObjectId"
        - name: noteId
          in: path
          required: true
          schema: { $ref: "#/components/schemas/Uid" }
      requestBody:
        required: true
        content:
          text/markdown: { schema: { type: string } }
          application/prose+json: { schema: { $ref: "#/components/schemas/Prose" } }
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        "404": { $ref: "#/components/responses/Problem" }
        default: { $ref: "#/components/responses/Problem" }
    delete:
      tags: [Objects]
      summary: Delete an object note
      operationId: deleteObjectNote
      x-credit-cost: 1
      x-idempotent: true
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectIdAsObjectId"
        - name: noteId
          in: path
          required: true
          schema: { $ref: "#/components/schemas/Uid" }
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        default: { $ref: "#/components/responses/Problem" }

  /objects/{objectId}/tags:
    post:
      tags: [Objects, Tags]
      summary: Add tags to an object
      operationId: addObjectTags
      x-credit-cost: 2
      x-idempotent: true
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectIdAsObjectId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [tags]
              properties:
                tags:
                  type: array
                  items: { $ref: "#/components/schemas/ObjectTag" }
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        default: { $ref: "#/components/responses/Problem" }
    delete:
      tags: [Objects, Tags]
      summary: Remove tags from an object
      operationId: removeObjectTags
      x-credit-cost: 2
      x-idempotent: true
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectIdAsObjectId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items: { $ref: "#/components/schemas/TagReference" }
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        default: { $ref: "#/components/responses/Problem" }

  /objects/{objectId}/spaces:
    post:
      tags: [Objects, Spaces]
      summary: Add an object to spaces
      description: Adds one object to one or more spaces. Objects may belong to at most 100 spaces.
      operationId: addObjectSpaces
      x-credit-cost: 2
      x-idempotent: true
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectIdAsObjectId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items: { $ref: "#/components/schemas/ObjectSpace" }
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        default: { $ref: "#/components/responses/Problem" }

  /objects/{id}/pin:
    post:
      tags: [Objects]
      summary: Pin an object
      operationId: pinObject
      x-credit-cost: 3
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectId"
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                position: { type: number, description: Zero-based top-of-mind slot. }
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        default: { $ref: "#/components/responses/Problem" }
    delete:
      tags: [Objects]
      summary: Unpin an object
      operationId: unpinObject
      x-credit-cost: 3
      x-idempotent: true
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectId"
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        default: { $ref: "#/components/responses/Problem" }

  /objects/{id}/restore:
    post:
      tags: [Objects]
      summary: Restore an object
      operationId: restoreObject
      x-credit-cost: 1
      x-idempotent: true
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/ObjectId"
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        default: { $ref: "#/components/responses/Problem" }

  /spaces:
    get:
      tags: [Spaces]
      summary: List spaces
      operationId: listSpaces
      x-credit-cost: 10
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
      responses:
        "200":
          description: Spaces sorted by API default ordering.
          content: { application/json: { schema: { type: array, items: { $ref: "#/components/schemas/Space" } } } }
        default: { $ref: "#/components/responses/Problem" }
    post:
      tags: [Spaces]
      summary: Create a space
      operationId: createSpace
      x-credit-cost: 100
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: { type: string, description: Unique display name. }
                color: { $ref: "#/components/schemas/Color" }
      responses:
        "201": { description: Space created, content: { application/json: { schema: { $ref: "#/components/schemas/Space" } } } }
        "409": { $ref: "#/components/responses/Problem" }
        default: { $ref: "#/components/responses/Problem" }

  /spaces/{id}:
    get:
      tags: [Spaces]
      summary: Get a space
      operationId: getSpace
      x-credit-cost: 1
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/SpaceId"
      responses:
        "200": { description: Space with contained object IDs, content: { application/json: { schema: { $ref: "#/components/schemas/Space" } } } }
        default: { $ref: "#/components/responses/Problem" }
    patch:
      tags: [Spaces]
      summary: Update a space
      operationId: updateSpace
      x-credit-cost: 2
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/SpaceId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string }
                color: { $ref: "#/components/schemas/Color" }
      responses:
        "200": { description: Updated space, content: { application/json: { schema: { $ref: "#/components/schemas/Space" } } } }
        default: { $ref: "#/components/responses/Problem" }
    delete:
      tags: [Spaces]
      summary: Delete a space
      description: Deletes the space; objects inside are not deleted.
      operationId: deleteSpace
      x-credit-cost: 1
      x-idempotent: true
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - $ref: "#/components/parameters/SpaceId"
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        default: { $ref: "#/components/responses/Problem" }

  /spaces/{spaceId}/objects/{objectId}:
    put:
      tags: [Spaces, Objects]
      summary: Add an object to a space
      operationId: addObjectToSpace
      x-credit-cost: 3
      x-idempotent: true
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - name: spaceId
          in: path
          required: true
          schema: { $ref: "#/components/schemas/Uid" }
        - name: objectId
          in: path
          required: true
          schema: { $ref: "#/components/schemas/Uid" }
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        default: { $ref: "#/components/responses/Problem" }
    delete:
      tags: [Spaces, Objects]
      summary: Remove an object from a space
      operationId: removeObjectFromSpace
      x-credit-cost: 3
      x-idempotent: true
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - name: spaceId
          in: path
          required: true
          schema: { $ref: "#/components/schemas/Uid" }
        - name: objectId
          in: path
          required: true
          schema: { $ref: "#/components/schemas/Uid" }
      responses:
        "200": { $ref: "#/components/responses/EmptyObject" }
        default: { $ref: "#/components/responses/Problem" }

  /tags:
    get:
      tags: [Tags]
      summary: List tags
      description: Tags are created implicitly when first used; there is no standalone create tag endpoint.
      operationId: listTags
      x-credit-cost: 5
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - name: limit
          in: query
          schema: { type: integer, default: 1000, maximum: 10000, minimum: 1 }
      responses:
        "200": { description: Tags sorted by most recently used first, content: { application/json: { schema: { type: array, items: { $ref: "#/components/schemas/Tag" } } } } }
        default: { $ref: "#/components/responses/Problem" }

  /search:
    get:
      tags: [Search]
      summary: Search objects
      description: |
        Search with Lucene-inspired syntax, optional semantic search, related-object matching,
        and Mastermind-only reranking.
      operationId: searchObjects
      x-credit-cost: "10-250"
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - name: q
          in: query
          required: true
          schema: { type: string }
          description: "Query string. URL-encode operators such as `&&` and `:`."
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 1000, minimum: 1 }
        - name: semantic
          in: query
          schema: { type: boolean, default: false }
        - name: semanticBoost
          in: query
          schema: { type: number }
          description: Multiplier applied only when `semantic=true`.
        - name: similarTo
          in: query
          schema: { $ref: "#/components/schemas/Uid" }
          description: Mastermind-only related-object search. Implies semantic search.
        - name: rerank
          in: query
          schema: { type: boolean, default: false }
          description: Mastermind-only cross-encoder rerank. Implies semantic search and caps results at 100.
      responses:
        "200":
          description: Relevance-sorted matches.
          content:
            application/json:
              schema:
                type: object
                required: [matches]
                properties:
                  matches:
                    type: array
                    items: { $ref: "#/components/schemas/SearchMatch" }
        default: { $ref: "#/components/responses/Problem" }

  /convert:
    post:
      tags: [Convert]
      summary: Convert content
      description: Converts between plain text, Markdown, and mymind prose. Source and target formats must differ.
      operationId: convertContent
      x-credit-cost: 1
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - name: Content-Type
          in: header
          required: true
          schema: { $ref: "#/components/schemas/ConvertibleFormat" }
        - name: Accept
          in: header
          required: true
          schema: { $ref: "#/components/schemas/ConvertibleFormat" }
      requestBody:
        required: true
        content:
          text/plain: { schema: { type: string } }
          text/markdown: { schema: { type: string } }
          application/prose+json: { schema: { $ref: "#/components/schemas/Prose" } }
      responses:
        "200":
          description: Converted content.
          content:
            text/plain: { schema: { type: string } }
            text/markdown: { schema: { type: string } }
            application/prose+json: { schema: { $ref: "#/components/schemas/Prose" } }
        "422": { $ref: "#/components/responses/Problem" }
        default: { $ref: "#/components/responses/Problem" }

  /entities/{id}:
    get:
      tags: [Entities]
      summary: Get an entity
      description: |
        WIP/coming soon. The docs say type identifiers, property shapes, and this endpoint
        may change before launch. Do not ship production integrations against this path yet.
      operationId: getEntity
      x-status: coming-soon
      parameters:
        - $ref: "#/components/parameters/ApiVersion"
        - $ref: "#/components/parameters/UserAgent"
        - name: id
          in: path
          required: true
          schema: { $ref: "#/components/schemas/Uid" }
      responses:
        "200": { description: Entity, content: { application/json: { schema: { $ref: "#/components/schemas/Entity" } } } }
        default: { $ref: "#/components/responses/Problem" }

components:
  securitySchemes:
    signedJwt:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        HS256 JWT signed with the access key secret. Header: `alg=HS256`, `kid=<key id>`.
        Claims: `method` uppercase HTTP method, `path` request path without query string,
        `iat` Unix seconds, `exp` Unix seconds. Docs recommend `exp = iat + 300`.

  parameters:
    ApiVersion:
      name: API-Version
      in: header
      required: false
      schema: { type: string, examples: ["0.1"] }
      description: Pin production clients. Omitting pins to latest docs behavior.
    UserAgent:
      name: User-Agent
      in: header
      required: true
      schema: { type: string, minLength: 1 }
      description: Integration identifier. Requests without a user agent are rejected.
    ObjectId:
      name: id
      in: path
      required: true
      schema: { $ref: "#/components/schemas/Uid" }
    ObjectIdAsObjectId:
      name: objectId
      in: path
      required: true
      schema: { $ref: "#/components/schemas/Uid" }
    SpaceId:
      name: id
      in: path
      required: true
      schema: { $ref: "#/components/schemas/Uid" }

  headers:
    RateLimitPolicy:
      description: Quota and window per policy, e.g. `"burst";q=10000;w=300, "sustained";q=100000;w=2592000`.
      schema: { type: string }
    RateLimit:
      description: Remaining credits and reset per policy, e.g. `"burst";r=9990;t=300`.
      schema: { type: string }
    RateLimitCost:
      description: Credits charged for the request.
      schema: { type: integer }

  responses:
    EmptyObject:
      description: Empty JSON object.
      content:
        application/json:
          schema:
            type: object
            additionalProperties: false
    Problem:
      description: Error response.
      content:
        application/problem+json:
          schema: { $ref: "#/components/schemas/Problem" }
        application/json:
          schema: { $ref: "#/components/schemas/Problem" }

  schemas:
    Uid:
      type: string
      pattern: "^[A-Za-z0-9]{22}$"
      description: Case-sensitive 22-character base62 identifier.
    Timestamp:
      type: string
      format: date-time
      description: ISO 8601 UTC timestamp.
    Url:
      type: string
      format: uri
    Color:
      type: string
      description: CSS color value, usually a hex code.
    Palette:
      type: object
      additionalProperties:
        type: number
        minimum: 0
        maximum: 1
      description: Map of CSS color values to dominant-color weights.
    TextFormat:
      type: string
      enum: [text/markdown, application/prose+json, text/html]
    ConvertibleFormat:
      type: string
      enum: [text/plain, text/markdown, application/prose+json]
    Content:
      type: object
      required: [type, body]
      properties:
        type:
          type: string
          enum: [text/plain, text/markdown, text/html, application/prose+json]
        body:
          oneOf:
            - type: string
            - $ref: "#/components/schemas/Prose"
    Prose:
      type: object
      description: mymind internal prose JSON. Docs mark detailed prose support as WIP.
      additionalProperties: true
      examples:
        - type: doc
          content:
            - type: paragraph
              content:
                - type: text
                  text: Example
    BlobReference:
      type: object
      required: [path, type]
      properties:
        path: { type: string, description: "Path under `https://mymind.media`." }
        type: { type: string, description: MIME type. }
        url: { type: string, format: uri }
        width: { type: integer }
        height: { type: integer }
        palette: { $ref: "#/components/schemas/Palette" }
      additionalProperties: true
    AI:
      type: object
      properties:
        summary: { type: string, description: AI-generated summary. }
      additionalProperties: true
    Object:
      type: object
      required: [id, tags, bumped, created, modified]
      properties:
        id: { $ref: "#/components/schemas/Uid" }
        title: { type: string }
        summary: { type: string }
        content: { $ref: "#/components/schemas/Content" }
        blob: { $ref: "#/components/schemas/BlobReference" }
        screenshot: { $ref: "#/components/schemas/BlobReference" }
        entity: { $ref: "#/components/schemas/Entity" }
        spaces:
          type: array
          items: { $ref: "#/components/schemas/ObjectSpace" }
        tags:
          type: array
          items: { $ref: "#/components/schemas/ObjectTag" }
        notes:
          type: array
          items: { $ref: "#/components/schemas/ObjectNote" }
        source: { $ref: "#/components/schemas/ObjectSource" }
        ai: { $ref: "#/components/schemas/AI" }
        bumped: { $ref: "#/components/schemas/Timestamp" }
        created: { $ref: "#/components/schemas/Timestamp" }
        modified: { $ref: "#/components/schemas/Timestamp" }
        deleted: { $ref: "#/components/schemas/Timestamp" }
      additionalProperties: true
    CreateObjectRequest:
      type: object
      properties:
        title: { type: string }
        spaces:
          type: array
          items: { $ref: "#/components/schemas/ObjectSpace" }
        tags:
          type: array
          items: { $ref: "#/components/schemas/ObjectTag" }
        content:
          oneOf:
            - type: string
            - $ref: "#/components/schemas/Content"
        url: { $ref: "#/components/schemas/Url" }
      oneOf:
        - required: [url]
        - required: [content]
      additionalProperties: true
    ObjectSource:
      type: object
      properties:
        url: { type: string }
      additionalProperties: true
    ObjectSpace:
      type: object
      required: [id]
      properties:
        id: { $ref: "#/components/schemas/Uid" }
      additionalProperties: true
    ObjectNote:
      type: object
      required: [id, content]
      properties:
        id: { $ref: "#/components/schemas/Uid" }
        content: { $ref: "#/components/schemas/Content" }
      additionalProperties: true
    ObjectTag:
      type: object
      required: [name]
      properties:
        name: { type: string }
        flags: { $ref: "#/components/schemas/TagFlag" }
      additionalProperties: true
    TagReference:
      type: object
      oneOf:
        - required: [name]
        - required: [id]
      properties:
        id: { $ref: "#/components/schemas/Uid" }
        name: { type: string }
    Space:
      type: object
      required: [id, name, color, created]
      properties:
        id: { $ref: "#/components/schemas/Uid" }
        name: { type: string }
        color: { $ref: "#/components/schemas/Color" }
        created: { $ref: "#/components/schemas/Timestamp" }
        objects:
          type: array
          items:
            type: object
            required: [id]
            properties: { id: { $ref: "#/components/schemas/Uid" } }
      additionalProperties: true
    Tag:
      type: object
      required: [name]
      properties:
        name: { type: string }
        count: { type: integer }
        flags: { $ref: "#/components/schemas/TagFlag" }
        modified: { $ref: "#/components/schemas/Timestamp" }
      additionalProperties: true
    TagFlag:
      type: integer
      description: Bitmask. 0 None, 2 AI, 8 Manual.
      enum: [0, 2, 8]
    SearchMatch:
      type: object
      required: [id, score]
      properties:
        id: { $ref: "#/components/schemas/Uid" }
        score: { type: number }
        semanticScore: { type: number }
      additionalProperties: true
    Entity:
      type: object
      required: [id]
      properties:
        id: { $ref: "#/components/schemas/Uid" }
        type:
          type: string
          enum:
            - Apartment
            - Article
            - AudioObject
            - BlueSkyPost
            - Book
            - Brand
            - Business
            - Document
            - FacebookReel
            - Flight
            - FlightReservation
            - House
            - Human
            - ImageObject
            - InstagramPost
            - InstagramReel
            - Media
            - Model
            - Movie
            - MusicAlbum
            - MusicPlaylist
            - MusicRecording
            - MusicRelease
            - MusicVideo
            - Note
            - Painting
            - Palette
            - Periodical
            - Photograph
            - Place
            - Podcast
            - PodcastEpisode
            - PodcastSeason
            - Product
            - Quotation
            - RealEstateListing
            - Recipe
            - RedditPost
            - Repository
            - RepositoryIssue
            - Restaurant
            - ScholarlyArticle
            - Screenshot
            - SoftwareApplication
            - SubstackNote
            - TedTalk
            - ThreadsPost
            - TikTokPost
            - TVEpisode
            - TVSeason
            - TVSeries
            - Typeface
            - VideoGame
            - VideoObject
            - VimeoVideo
            - WebPage
            - WikipediaArticle
            - XPost
            - YouTubeVideo
      additionalProperties: true
    Problem:
      type: object
      properties:
        type: { type: string }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string }
      additionalProperties: true
```

## Authentication Contract

JWTs are request-bound. The token payload signs only the path, not the query string.

Required JWT header:

| Field | Value |
| --- | --- |
| `alg` | `HS256` |
| `kid` | access key identifier |

Required JWT claims:

| Claim | Meaning |
| --- | --- |
| `method` | Uppercase HTTP method, e.g. `GET` |
| `path` | Request path, e.g. `/objects`; exclude query string |
| `iat` | Issued-at Unix seconds |
| `exp` | Expiry Unix seconds; docs recommend `iat + 300` |

Access keys have two dimensions:

| Dimension | Values | Current caveat |
| --- | --- | --- |
| Access level | Read only, Full access | Full access can create, update, and delete within scope. |
| Content scope | Everything, Non-sensitive | Docs say content scope is not currently enforced; every key can see Everything until enforcement ships. |

## Error and Rate-Limit Contract

Common status codes:

| Status | Meaning |
| --- | --- |
| `400` | Invalid request, such as combining `url` and `content` when creating an object. |
| `401` | Missing, malformed, expired, or invalid JWT. |
| `403` | Key lacks access level/scope for the operation. |
| `404` | Resource not found. |
| `406` | Requested `Accept` format is not supported. |
| `409` | Conflict, e.g. duplicate space name. |
| `413` | Upload exceeds 64 MB. |
| `415` | Unsupported upload MIME type. |
| `422` | Semantically valid request cannot be performed, e.g. blob requested for a non-blob object or unsupported conversion. |
| `429` | Credit quota exhausted. Back off until the slowest exhausted `RateLimit` policy resets. |

Every response should be handled with:

| Header | Meaning |
| --- | --- |
| `RateLimit-Policy` | Policy quota and window, e.g. burst/sustained. |
| `RateLimit` | Remaining credits and reset seconds after the current request. |
| `RateLimit-Cost` | Credits charged for the request. |

## Query Syntax

`/search` and `GET /objects?q=...` support Lucene-inspired syntax:

| Syntax | Meaning |
| --- | --- |
| `design` | Term match across title, content, or URL. |
| `"design tools"` | Exact phrase. |
| `design && tools` | Both terms; default between terms. |
| `design || sketch` | Either term. |
| `design -figma` | Exclude term. |
| `des*` | Prefix wildcard. |
| `tag:reading` | Filter by tag. |
| `type:image` | Filter by object type. |
| `title:"plain text"` | Filter title. |
| `author:"jenny holzer"` | Filter source author. |
| `domain:nytimes.com` | Filter source domain. |
| `action:read` | Filter action. |
| `action:read && completed:false` | Pending action filter. |

## Supported Upload Formats

Uploads are capped at 64 MB.

| Media | MIME types |
| --- | --- |
| Images | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/avif`, `image/heif`, `image/jxl`, `image/bmp`, `image/tiff`, `image/vnd.adobe.photoshop`, `image/svg+xml` |
| Text | `text/markdown` |
| Documents | `application/pdf` |
| Video, Mastermind only | `video/mp4`, `video/quicktime`, `video/webm`, `video/x-msvideo`, `video/x-matroska` |
| Audio | Coming soon |

## Markdown Conversion Boundaries

Markdown and prose conversion is intentionally lossy for prose-only features. Integrations should preserve prose JSON when task lists, rich blocks, or unknown node attributes matter. Use Markdown when human-editable plain text matters more than exact internal formatting.

## Implementation Drift Notes

These are not spec changes; they are local-wrapper follow-ups discovered while comparing the docs to this repository.

| Docs surface | Local wrapper status |
| --- | --- |
| `GET /objects/{id}/screenshot` | Not currently implemented in `src/mymind/client.ts`. |
| `POST /objects/{objectId}/notes` | Not currently implemented. |
| `PUT /objects/{objectId}/notes/{noteId}` | Wrapper has older `PUT /objects/{id}/content` note replacement, not per-note update. |
| `DELETE /objects/{objectId}/notes/{noteId}` | Not currently implemented. |
| `DELETE /objects/{objectId}/tags` | Not currently implemented. |
| `GET /objects?spaceId=...` | Passthrough query type supports it, but no dedicated CLI/MCP surface noted. |
| `GET /objects?similarTo=...` | Docs now list this in objects; wrapper currently maps related search to `/search?similarTo=...`. |
| `API-Version` header | Documented by `/api/versioning`; wrapper does not expose a first-class option. |

## Source Pages Covered

- `https://access.mymind.com/api`
- `https://access.mymind.com/api/authentication`
- `https://access.mymind.com/api/access-control`
- `https://access.mymind.com/api/rate-limits`
- `https://access.mymind.com/api/errors`
- `https://access.mymind.com/api/versioning`
- `https://access.mymind.com/api/objects`
- `https://access.mymind.com/api/spaces`
- `https://access.mymind.com/api/tags`
- `https://access.mymind.com/api/entities`
- `https://access.mymind.com/api/convert`
- `https://access.mymind.com/api/search`
- `https://access.mymind.com/api/types`
- `https://access.mymind.com/api/sdks`
- `https://access.mymind.com/api/supported-formats`
- `https://access.mymind.com/api/markdown-support`
- `https://access.mymind.com/api/prose`
- `https://access.mymind.com/api/llm`
- `https://access.mymind.com/api/changelog`
- `https://access.mymind.com/api/terms`
