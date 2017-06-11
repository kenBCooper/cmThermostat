import { applyMiddleware, createStore } from 'redux';
import logger from 'redux-logger';
import appReducer from '../reducer/AppReducer';

export const initializeStore = () => {
  return createStore(appReducer, {}, applyMiddleware(logger));
};