import { applyMiddleware, createStore } from 'redux';
import { createLogger } from 'redux-logger';
import appReducer from '../reducer/AppReducer';

export const initializeStore = () => {
  const logger = createLogger({
    collapsed: true,
  });

  return createStore(appReducer, appReducer.DEFAULT_STATE, applyMiddleware(logger));
};