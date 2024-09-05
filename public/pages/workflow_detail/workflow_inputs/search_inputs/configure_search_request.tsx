/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useFormikContext } from 'formik';
import {
  EuiSmallButton,
  EuiCompressedFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCompressedFormRow,
  EuiCompressedSuperSelect,
  EuiSuperSelectOption,
  EuiText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import {
  SearchHit,
  WorkflowFormValues,
  customStringify,
} from '../../../../../common';
import { JsonField } from '../input_fields';
import { AppState, searchIndex, useAppDispatch } from '../../../../store';
import { getDataSourceId } from '../../../../utils/utils';
import { EditQueryModal } from './edit_query_modal';

interface ConfigureSearchRequestProps {
  setQuery: (query: string) => void;
  setQueryResponse: (queryResponse: string) => void;
}

/**
 * Input component for configuring a search request
 */
export function ConfigureSearchRequest(props: ConfigureSearchRequestProps) {
  const dispatch = useAppDispatch();
  const dataSourceId = getDataSourceId();

  // Form state
  const { values, setFieldValue, setFieldTouched } = useFormikContext<
    WorkflowFormValues
  >();
  const ingestEnabled = values?.ingest?.enabled;
  const searchIndexNameFormPath = 'search.index.name';

  // All indices state
  const indices = useSelector((state: AppState) => state.opensearch.indices);

  // Selected index state
  const [selectedIndex, setSelectedIndex] = useState<string | undefined>(
    values?.search?.index?.name
  );

  // initial load: set the search index value, if not already set
  useEffect(() => {
    if (values?.ingest?.enabled) {
      setFieldValue(searchIndexNameFormPath, values?.ingest?.index?.name);
    }
  }, []);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Hook to listen when the query form value changes.
  // Try to set the query request if possible
  useEffect(() => {
    if (values?.search?.request) {
      props.setQuery(values.search.request);
    }
  }, [values?.search?.request]);

  return (
    <>
      {isEditModalOpen && (
        <EditQueryModal
          setModalOpen={setIsEditModalOpen}
          queryFieldPath="search.request"
        />
      )}
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>Configure query</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCompressedFormRow label="Retrieval index">
            {ingestEnabled ? (
              <EuiCompressedFieldText
                value={values?.ingest?.index?.name}
                readOnly={true}
              />
            ) : (
              <EuiCompressedSuperSelect
                options={Object.values(indices).map(
                  (option) =>
                    ({
                      value: option.name,
                      inputDisplay: <EuiText>{option.name}</EuiText>,
                      disabled: false,
                    } as EuiSuperSelectOption<string>)
                )}
                valueOfSelected={selectedIndex}
                onChange={(option) => {
                  setSelectedIndex(option);
                  setFieldValue(searchIndexNameFormPath, option);
                  setFieldTouched(searchIndexNameFormPath, true);
                }}
                isInvalid={selectedIndex === undefined}
              />
            )}
          </EuiCompressedFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSmallButton
            fill={false}
            style={{ width: '100px' }}
            onClick={() => setIsEditModalOpen(true)}
          >
            Edit
          </EuiSmallButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <JsonField
            label="Query"
            fieldPath={'search.request'}
            editorHeight="25vh"
            readOnly={true}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <>
            <EuiSmallButton
              fill={false}
              style={{ width: '100px' }}
              onClick={() => {
                // for this test query, we don't want to involve any configured search pipelines, if any exist
                // see https://opensearch.org/docs/latest/search-plugins/search-pipelines/using-search-pipeline/#disabling-the-default-pipeline-for-a-request
                dispatch(
                  searchIndex({
                    apiBody: {
                      index: values.search.index.name,
                      body: values.search.request,
                      searchPipeline: '_none',
                    },
                    dataSourceId,
                  })
                )
                  .unwrap()
                  .then(async (resp) => {
                    props.setQueryResponse(
                      customStringify(
                        resp.hits.hits.map((hit: SearchHit) => hit._source)
                      )
                    );
                  })
                  .catch((error: any) => {
                    props.setQueryResponse('');
                    console.error('Error running query: ', error);
                  });
              }}
            >
              Test
            </EuiSmallButton>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              Run query without any search pipeline configuration.
            </EuiText>
          </>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
