/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import {
  EuiFlexItem,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiCompressedFieldSearch,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import { UseCase } from './use_case';
import {
  FETCH_ALL_QUERY_LARGE,
  Workflow,
  WorkflowTemplate,
} from '../../../../common';
import {
  AppState,
  useAppDispatch,
  getWorkflowPresets,
  searchModels,
  searchConnectors,
} from '../../../store';
import { enrichPresetWorkflowWithUiMetadata } from './utils';
import { getDataSourceId, isDataSourceReady } from '../../../utils';
import { getCore, getDataSourceEnabled } from '../../../services';
import semver from 'semver';
import { DataSourceAttributes } from '../../../../../../src/plugins/data_source/common/data_sources';
import { getSavedObjectsClient } from '../../../../public/services';
import {
  WORKFLOW_TYPE,
  MIN_SUPPORTED_VERSION,
  MINIMUM_FULL_SUPPORTED_VERSION,
} from '../../../../common/constants';

interface NewWorkflowProps {}

export const getEffectiveVersion = async (
  dataSourceId: string | undefined
): Promise<string> => {
  try {
    if (dataSourceId === undefined) {
      throw new Error('Data source is required');
    }

    if (dataSourceId === '') {
      const response = await getCore().http.post('/api/console/proxy', {
        query: { path: '/', method: 'GET', dataSourceId: '' },
      });
      return response.version.number;
    }

    const dataSource = await getSavedObjectsClient().get<DataSourceAttributes>(
      'data-source',
      dataSourceId
    );
    const version =
      dataSource?.attributes?.dataSourceVersion || MIN_SUPPORTED_VERSION;
    return version;
  } catch (error) {
    console.error('Error getting version:', error);
    return MIN_SUPPORTED_VERSION;
  }
};

const filterPresetsByVersion = async (
  workflows: WorkflowTemplate[],
  dataSourceId: string | undefined
): Promise<WorkflowTemplate[]> => {
  // if MDS is disabled, skip the version check and assume it is version 2.19+
  const dataSourceEnabled = getDataSourceEnabled().enabled;
  if (!dataSourceEnabled) {
    return workflows;
  }

  if (dataSourceId === undefined) {
    return [];
  }

  const allowedPresetsFor217 = [
    WORKFLOW_TYPE.SEMANTIC_SEARCH,
    WORKFLOW_TYPE.MULTIMODAL_SEARCH,
    WORKFLOW_TYPE.HYBRID_SEARCH,
  ];

  const version = await getEffectiveVersion(dataSourceId);

  if (semver.lt(version, MIN_SUPPORTED_VERSION)) {
    return [];
  }

  if (
    semver.gte(version, MIN_SUPPORTED_VERSION) &&
    semver.lt(version, MINIMUM_FULL_SUPPORTED_VERSION)
  ) {
    return workflows.filter((workflow) => {
      const workflowType = workflow.ui_metadata?.type ?? WORKFLOW_TYPE.UNKNOWN;
      return allowedPresetsFor217.includes(workflowType as WORKFLOW_TYPE);
    });
  }

  return workflows;
};

/**
 * Contains the searchable library of templated workflows based
 * on a variety of use cases. Can click on them to load in a pre-configured
 * workflow for users to start with.
 */
export function NewWorkflow(props: NewWorkflowProps) {
  const dispatch = useAppDispatch();
  const dataSourceId = getDataSourceId();
  const dataSourceEnabled = getDataSourceEnabled().enabled;
  // workflows state
  const { presetWorkflows, loading } = useSelector(
    (state: AppState) => state.presets
  );
  const [allWorkflows, setAllWorkflows] = useState<WorkflowTemplate[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<
    WorkflowTemplate[]
  >([]);
  const [isVersionLoading, setIsVersionLoading] = useState(false);

  // search bar state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debounceSearchQuery = debounce((query: string) => {
    setSearchQuery(query);
  }, 200);

  // on initial load:
  // 1. fetch the workflow presets persisted on server-side
  // 2. fetch the ML models and connectors. these may be used in quick-create views when selecting a preset,
  //    so we optimize by fetching once at the top-level here.
  useEffect(() => {
    dispatch(getWorkflowPresets());
    if (isDataSourceReady(dataSourceId)) {
      dispatch(searchModels({ apiBody: FETCH_ALL_QUERY_LARGE, dataSourceId }));
      dispatch(
        searchConnectors({ apiBody: FETCH_ALL_QUERY_LARGE, dataSourceId })
      );
    }
  }, [dataSourceId, dataSourceEnabled]);

  // initial hook to populate all workflows
  // enrich them with dynamically-generated UI flows based on use case
  useEffect(() => {
    const loadWorkflows = async () => {
      if (!presetWorkflows || presetWorkflows.length === 0) {
        return;
      }

      const dataSourceEnabled = getDataSourceEnabled().enabled;

      if (!dataSourceEnabled) {
        const enrichedWorkflows = presetWorkflows.map((presetWorkflow) =>
          enrichPresetWorkflowWithUiMetadata(
            presetWorkflow,
            MINIMUM_FULL_SUPPORTED_VERSION
          )
        );
        setAllWorkflows(enrichedWorkflows);
        setFilteredWorkflows(enrichedWorkflows);
        setIsVersionLoading(false);
        return;
      }

      if (dataSourceId === undefined) {
        setAllWorkflows([]);
        setFilteredWorkflows([]);
        setIsVersionLoading(true);
        return;
      }

      setIsVersionLoading(true);

      const version = await getEffectiveVersion(dataSourceId);

      const enrichedWorkflows = presetWorkflows.map((presetWorkflow) =>
        enrichPresetWorkflowWithUiMetadata(presetWorkflow, version)
      );

      const versionFilteredWorkflows = await filterPresetsByVersion(
        enrichedWorkflows,
        dataSourceId
      );

      setAllWorkflows(versionFilteredWorkflows);
      setFilteredWorkflows(versionFilteredWorkflows);
      setIsVersionLoading(false);
    };

    loadWorkflows();
  }, [presetWorkflows, dataSourceId, dataSourceEnabled]);

  // When search query updated, re-filter preset list
  useEffect(() => {
    setFilteredWorkflows(fetchFilteredWorkflows(allWorkflows, searchQuery));
  }, [searchQuery]);

  useEffect(() => {
    setFilteredWorkflows(allWorkflows);
  }, [allWorkflows]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={true}>
        <EuiCompressedFieldSearch
          fullWidth={true}
          placeholder="Search"
          onChange={(e) => debounceSearchQuery(e.target.value)}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {loading || isVersionLoading ? (
          <EuiFlexGroup
            justifyContent="center"
            alignItems="center"
            style={{ minHeight: '400px' }}
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGrid columns={3} gutterSize="l">
            {filteredWorkflows.map((workflow: Workflow, index) => {
              return (
                <EuiFlexItem key={index}>
                  <UseCase workflow={workflow} />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGrid>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// Collect the final preset workflow list after applying all filters
function fetchFilteredWorkflows(
  allWorkflows: Workflow[],
  searchQuery: string
): Workflow[] {
  return searchQuery.length === 0
    ? allWorkflows
    : allWorkflows.filter((workflow) =>
        workflow.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
}
