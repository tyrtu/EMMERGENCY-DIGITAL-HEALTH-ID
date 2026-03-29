import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import mobileReducer from './mobileSlice';
export const store = configureStore({
  reducer: {
    auth: authReducer,
    mobile: mobileReducer,
  },
});
