// Twitter/X uses its own file convention (twitter-image) separate from
// the OpenGraph one, so we re-export the same generator to keep the
// image consistent across every platform.
export { default, alt, size, contentType, runtime } from "./opengraph-image";
