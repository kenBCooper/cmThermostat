import { applyMiddleware, createStore } from 'redux';
import { createLogger } from 'redux-logger';
import appReducer from '../reducer/AppReducer';

let store;

export const getStore = () => store;

export const initializeStore = () => {
  const logger = createLogger({
    collapsed: true,
  });

  store = createStore(appReducer, appReducer.DEFAULT_STATE, applyMiddleware(logger));
  return store;
};
