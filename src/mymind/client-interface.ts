import type {
  ConvertInput,
  CreateObjectFromFileOptions,
  ListOptions,
  MyMindRawResponse,
  MyMindRequestOptions,
  MyMindResponse,
  ObjectCreateInput,
  ObjectUpdateInput,
  SearchInput,
  SpaceCreateInput,
  SpaceUpdateInput
} from "./client.js";
import type { MymindConvertResult, MymindObject, MymindSearchResult, MymindSpace, MymindTag } from "./schemas.js";

export interface MyMindClientInterface {
  listObjects(options?: ListOptions): Promise<MyMindResponse<MymindObject[] | unknown>>;
  getObject(id: string): Promise<MyMindResponse<MymindObject>>;
  createObject(input: ObjectCreateInput): Promise<MyMindResponse<MymindObject>>;
  createObjectFromFile(filePath: string, options?: CreateObjectFromFileOptions): Promise<MyMindResponse<MymindObject>>;
  updateObject(id: string, input: ObjectUpdateInput): Promise<MyMindResponse<MymindObject>>;
  deleteObject(id: string): Promise<MyMindResponse<unknown>>;
  findRelatedObjects(id: string, options?: ListOptions): Promise<MyMindResponse<unknown>>;
  requestRaw(options: MyMindRequestOptions): Promise<MyMindRawResponse>;
  getObjectContent(
    id: string,
    format: "text/markdown" | "application/prose+json" | "text/html"
  ): Promise<MyMindResponse<unknown>>;
  replaceObjectContent(
    id: string,
    content: string | Record<string, unknown>,
    contentType: "text/markdown" | "application/prose+json"
  ): Promise<MyMindResponse<unknown>>;
  addObjectTags(
    objectId: string,
    tags: Array<{ name: string; flags?: number | undefined }>
  ): Promise<MyMindResponse<unknown>>;
  addObjectSpaces(objectId: string, spaces: Array<{ id: string }>): Promise<MyMindResponse<unknown>>;
  pinObject(id: string, position?: number): Promise<MyMindResponse<unknown>>;
  unpinObject(id: string): Promise<MyMindResponse<unknown>>;
  restoreObject(id: string): Promise<MyMindResponse<unknown>>;

  listSpaces(options?: ListOptions): Promise<MyMindResponse<MymindSpace[] | unknown>>;
  getSpace(id: string): Promise<MyMindResponse<MymindSpace>>;
  createSpace(input: SpaceCreateInput): Promise<MyMindResponse<MymindSpace>>;
  updateSpace(id: string, input: SpaceUpdateInput): Promise<MyMindResponse<MymindSpace>>;
  deleteSpace(id: string): Promise<MyMindResponse<unknown>>;
  addObjectToSpace(spaceId: string, objectId: string): Promise<MyMindResponse<unknown>>;
  removeObjectFromSpace(spaceId: string, objectId: string): Promise<MyMindResponse<unknown>>;

  listTags(options?: ListOptions): Promise<MyMindResponse<MymindTag[] | unknown>>;
  search(input: SearchInput): Promise<MyMindResponse<MymindSearchResult>>;
  convert(input: ConvertInput): Promise<MyMindResponse<MymindConvertResult>>;
}
