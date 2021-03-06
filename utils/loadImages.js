const { createRemoteFileNode } = require("gatsby-source-filesystem");

function isImageKey(key, imageKeys) {
  return imageKeys.includes(key);
}

async function createImageNodes({
  entity,
  createNode,
  createNodeId,
  store,
  cache,
  imageName,
  imageCacheKey,
  ext,
}) {
  let fileNode;
  try {
    fileNode = await createRemoteFileNode({
      url: entity.data.url,
      store,
      cache,
      createNode,
      createNodeId,
      ext,
    });
  } catch (e) {
    console.log(e);
  }
  if (fileNode) {
    await cache.set(imageCacheKey, {
      fileNodeID: fileNode.id,
      modified: entity.data.modified,
    });
    console.log("Image downloaded: " + imageName);
    return {
      ...entity,
      links: {
        ...entity.links,
        local___NODE: fileNode.id,
      },
    };
  }
  return entity;
}

async function loadImages({
  entities,
  imageKeys,
  createNode,
  createNodeId,
  store,
  cache,
  touchNode,
  ext,
}) {
  return Promise.all(
    entities.map(async (entity) => {
      if (!isImageKey(entity.name, imageKeys) || !entity.data.url) {
        return Promise.resolve(entity);
      }

      const imageName = entity.data.url.match(/([^/]*)\/*$/)[1];
      const imageCacheKey = `local-image-${imageName}`;
      const cachedImage = await cache.get(imageCacheKey);
      // If we have cached image and it wasn't modified, reuse
      // previously created file node to not try to redownload
      if (
        cachedImage &&
        entity.data.modified &&
        entity.data.modified === cachedImage.modified
      ) {
        const { fileNodeID } = cachedImage;
        touchNode({ nodeId: fileNodeID });
        console.log("Image from Cache: " + imageName);
        return Promise.resolve({
          ...entity,
          links: {
            ...entity.links,
            local___NODE: fileNodeID,
          },
        });
      }
      return createImageNodes({
        entity,
        createNode,
        createNodeId,
        store,
        cache,
        imageName,
        imageCacheKey,
        ext,
      });
    })
  );
}

module.exports = loadImages;
