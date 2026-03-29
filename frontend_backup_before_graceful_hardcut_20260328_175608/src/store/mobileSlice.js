import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    isMobile: false,
};

const mobileSlice = createSlice({
    name: "mobile",
    initialState,
    reducers: {
        setIsMobile: (state, action) => {
            state.isMobile = action.payload;
        },
    },
});

export const { setIsMobile } = mobileSlice.actions;
export default mobileSlice.reducer;