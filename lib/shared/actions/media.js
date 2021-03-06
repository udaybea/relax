import actionTypes from 'actions';
import request from 'helpers/request';
import {mutation} from 'relate-js';
import {fragmentToQL} from 'relax-fragments';

export function changeMediaDisplay (display) {
  return {
    type: actionTypes.changeMediaDisplay,
    display
  };
}

export function getMediaItem (fragments, id) {
  return (dispatch) => (
    request({
      dispatch,
      type: actionTypes.getMediaItem,
      query: `
        query mediaItem ($id: ID!) {
          mediaItem (id: $id) {
            ${fragmentToQL(fragments.media)}
          }
        }
      `,
      variables: {
        id
      }
    })
  );
}

export function uploadMedia (fragments, file) {
  const data = {
    file
  };

  return (dispatch) => (
    request({
      dispatch,
      type: actionTypes.addMedia,
      query: `
        mutation addMedia ($data: MediaInput!) {
          addMedia (data: $data) {
            ${fragmentToQL(fragments.media)}
          }
        }
      `,
      files: [file],
      variables: {
        data
      }
    })
  );
}

export function addingMedia (fileInfo) {
  return {
    type: actionTypes.addingMedia,
    fileInfo
  };
}

export function addMedia (fragments, file, fileInfo) {
  return {
    types: [
      'ADD_MEDIA_START',
      'ADD_MEDIA_SUCCESS',
      'ADD_MEDIA_ERROR'
    ],
    payload: [addingMedia.bind(null, fileInfo), uploadMedia.bind(null, fragments, file)],
    sequence: true
  };
}

const uploadsAtTime = 3;
let uploadsID = 0;
let uploadingNumber = 0;
let uploadQueue = [];

// Check if there are files to upload and initiates if there is
function checkUploadQueue (dispatch, getState) {
  if (uploadQueue.length) {
    let numberToUpload = Math.min(uploadsAtTime - uploadingNumber, uploadQueue.length);
    uploadingNumber += numberToUpload;

    for (numberToUpload; numberToUpload > 0; numberToUpload--) {
      const file = uploadQueue.shift();
      const reader = new FileReader();
      reader.onload = (event) => {
        dispatch({
          type: actionTypes.uploadingMedia,
          fileId: file.id
        });
        mutation({
          fragments: {
            addMedia: {
              _id: 1,
              name: 1,
              fileName: 1,
              type: 1,
              size: 1,
              filesize: 1,
              dimension: {
                width: 1,
                height: 1
              },
              url: 1,
              absoluteUrl: 1,
              date: 1,
              thumbnail: 1,
              variations: 1
            }
          },
          variables: {
            addMedia: {
              data: {
                value: {
                  file: {
                    file: event.target.result,
                    filename: file.name
                  }
                },
                type: 'MediaInput!'
              }
            }
          }
        }, (result) => {
          if (result.addMedia) {
            dispatch({
              type: actionTypes.mediaUploadSuccess,
              fileId: file.id
            });
          } else {
            dispatch({
              type: actionTypes.mediaUploadError,
              fileId: file.id
            });
          }
        })(dispatch, getState)
        .catch(() => {
          dispatch({
            type: actionTypes.mediaUploadError,
            fileId: file.id
          });
        })
        .fin(() => {
          uploadingNumber--;
          checkUploadQueue(dispatch, getState);
        });
      };
      reader.readAsDataURL(file);
    }
  }
}

export function uploadMediaFiles (files) {
  uploadQueue = uploadQueue.concat(files);

  return (dispatch, getState) => {
    // add to files uploading
    dispatch({
      type: actionTypes.addFilesToUpload,
      files: files.map((file) => Object.assign(file, {id: uploadsID++}))
    });

    checkUploadQueue(dispatch, getState);
  };
}

export function removeMediaItems (ids) {
  return mutation({
    fragments: {
      removeMedia: {
        _id: 1
      }
    },
    variables: {
      removeMedia: {
        ids: {
          value: ids,
          type: '[ID!]'
        }
      }
    },
    type: 'REMOVE'
  });
}

export function removeMediaItem (id) {
  return mutation({
    fragments: {
      removeMediaItem: {
        _id: 1
      }
    },
    variables: {
      removeMediaItem: {
        id: {
          value: id,
          type: 'ID!'
        }
      }
    },
    type: 'REMOVE'
  });
}
