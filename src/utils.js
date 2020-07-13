/*
 * Various helpers shared across modules
 */

// 'https://storage.googleapis.com/media.getbitesnap.com/prod/media/ad/94/b9e0231e449987c56f15aaa7701b.jpeg'
// Becomes
// ad94b9e0231e449987c56f15aaa7701b.jpeg
const getImageId = (url) => url.split("/media/")[1].replace(/\//g, "");

module.exports = { getImageId };
