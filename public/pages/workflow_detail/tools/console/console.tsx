import React, { ReactNode } from 'react';
import { isEmpty } from 'lodash';
import {
  EuiCodeBlock,
  EuiCodeEditor,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiAccordion,
  EuiBadge,
} from '@elastic/eui';

interface ConsoleProps {
  errorMessages: (string | ReactNode)[];
  errorCount: number;
  ingestResponse: string;
}

/**
 * The console component that displays both errors and responses
 * in a unified interface at the bottom of the workspace.
 */
export function Console(props: ConsoleProps) {
  const hasErrors = props.errorMessages?.length > 0;
  const hasIngestResponse = !isEmpty(props.ingestResponse);
  const hasAnyContent = hasErrors || hasIngestResponse;

  if (!hasAnyContent) {
    return (
      <EuiEmptyPrompt
        title={<h3>No console output</h3>}
        titleSize="s"
        body={
          <EuiText size="s" color="subdued">
            Errors and responses will appear here when you test your workflow.
          </EuiText>
        }
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" style={{ height: '100%' }}>
      {hasErrors && (
        <EuiFlexItem grow={false}>
          <EuiAccordion
            id="console-errors"
            buttonContent={
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>Errors</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="danger">{props.errorCount}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            initialIsOpen={true}
            paddingSize="s"
          >
            <EuiFlexGroup direction="column" gutterSize="s">
              {props.errorMessages.map((errorMessage, idx) => (
                <EuiFlexItem grow={false} key={idx}>
                  <EuiCodeBlock
                    fontSize="s"
                    isCopyable={false}
                    paddingSize="s"
                    color="danger"
                    style={{
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                    whiteSpace="pre-wrap"
                  >
                    {errorMessage}
                  </EuiCodeBlock>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiAccordion>
        </EuiFlexItem>
      )}

      {hasErrors && hasIngestResponse && (
        <EuiFlexItem grow={false}>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      )}

      {hasIngestResponse && (
        <EuiFlexItem grow={true}>
          <EuiAccordion
            id="console-responses"
            buttonContent={
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>Responses</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="success">Success</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            initialIsOpen={true}
            paddingSize="s"
          >
            <div style={{ height: '200px', minHeight: '200px' }}>
              <EuiCodeEditor
                mode="json"
                theme="textmate"
                width="100%"
                height="100%"
                value={props.ingestResponse}
                readOnly={true}
                setOptions={{
                  fontSize: '12px',
                  autoScrollEditorIntoView: true,
                  wrap: true,
                  showLineNumbers: false,
                  showGutter: false,
                }}
                tabSize={2}
              />
            </div>
          </EuiAccordion>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
