import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {RootState} from '../../app/store';

export type RequestedData = {
  dataType: string;
}

const initialState: RequestedData = {
  dataType: 'json'
};

export const downloadSlice = createSlice({
  name: 'download',
  initialState,
  reducers: {
    setDataType: (state, action: PayloadAction<string>) => {
      state.dataType = action.payload;
    },
  },
});

export const {setDataType} = downloadSlice.actions;

export const selectDataType = (state: RootState) => state.download.dataType;

export default downloadSlice.reducer;
