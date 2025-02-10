/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { WorkflowTemplate } from '../../../common';
import { HttpFetchError } from '../../../../../src/core/public';
import { getRouteService } from '../../services';
import { getEffectiveVersion } from '../../pages/workflows/new_workflow/new_workflow';

export const INITIAL_PRESETS_STATE = {
  loading: false,
  versionLoading: false,
  errorMessage: '',
  presetWorkflows: [] as Partial<WorkflowTemplate>[],
  version: null as string | null,
};

const PRESET_ACTION_PREFIX = 'presets';
const GET_WORKFLOW_PRESETS_ACTION = `${PRESET_ACTION_PREFIX}/getPresets`;
const GET_VERSION_ACTION = `${PRESET_ACTION_PREFIX}/getVersion`;

export const getWorkflowPresets = createAsyncThunk(
  GET_WORKFLOW_PRESETS_ACTION,
  async (_, { rejectWithValue }) => {
    const response:
      | any
      | HttpFetchError = await getRouteService().getWorkflowPresets();
    if (response instanceof HttpFetchError) {
      return rejectWithValue(
        'Error getting workflow presets: ' + response.body.message
      );
    } else {
      return response;
    }
  }
);

export const getVersion = createAsyncThunk(
  GET_VERSION_ACTION,
  async (dataSourceId: string | undefined, { rejectWithValue }) => {
    try {
      const version = await getEffectiveVersion(dataSourceId);
      return version;
    } catch (error) {
      return rejectWithValue('Error getting version: ' + error);
    }
  }
);

const presetsSlice = createSlice({
  name: 'presets',
  initialState: INITIAL_PRESETS_STATE,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getWorkflowPresets.pending, (state, action) => {
        state.loading = true;
        state.errorMessage = '';
      })
      .addCase(getWorkflowPresets.fulfilled, (state, action) => {
        state.presetWorkflows = action.payload.workflowTemplates as Partial<
          WorkflowTemplate
        >[];
        state.loading = false;
        state.errorMessage = '';
      })
      .addCase(getWorkflowPresets.rejected, (state, action) => {
        state.errorMessage = action.payload as string;
        state.loading = false;
      })
      .addCase(getVersion.pending, (state) => {
        state.versionLoading = true;
        state.errorMessage = '';
      })
      .addCase(getVersion.fulfilled, (state, action) => {
        state.version = action.payload;
        state.versionLoading = false;
        state.errorMessage = '';
      })
      .addCase(getVersion.rejected, (state, action) => {
        state.errorMessage = action.payload as string;
        state.versionLoading = false;
      });
  },
});

export const presetsReducer = presetsSlice.reducer;
