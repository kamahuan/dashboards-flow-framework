import React, { ReactNode, useState } from 'react';
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
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButtonIcon,
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
  const [fullscreenMode, setFullscreenMode] = useState<
    'errors' | 'responses' | null
  >(null);
  const openErrorsFullscreen = () => setFullscreenMode('errors');
  const openResponsesFullscreen = () => setFullscreenMode('responses');
  const closeFullscreen = () => setFullscreenMode(null);

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
    <>
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        style={{ height: '100%' }}
      >
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
              extraAction={
                <EuiButtonIcon
                  iconType="fullScreen"
                  onClick={openErrorsFullscreen}
                  aria-label="View errors in fullscreen"
                  size="s"
                />
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
              extraAction={
                <EuiButtonIcon
                  iconType="fullScreen"
                  onClick={openResponsesFullscreen}
                  aria-label="View responses in fullscreen"
                  size="s"
                />
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

      {fullscreenMode === 'errors' && (
        <EuiOverlayMask>
          <EuiModal
            onClose={closeFullscreen}
            style={{ width: '90vw', height: '90vh' }}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <h2>Errors</h2>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="danger">{props.errorCount}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <div style={{ height: '70vh', overflow: 'auto' }}>
                <EuiFlexGroup direction="column" gutterSize="m">
                  {props.errorMessages.map((errorMessage, idx) => (
                    <EuiFlexItem grow={false} key={idx}>
                      <EuiCodeBlock
                        fontSize="m"
                        isCopyable={true}
                        paddingSize="m"
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
              </div>
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      )}

      {fullscreenMode === 'responses' && (
        <EuiOverlayMask>
          <EuiModal
            onClose={closeFullscreen}
            style={{ width: '90vw', height: '90vh' }}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <h2>Responses</h2>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="success">Success</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <div style={{ height: '70vh' }}>
                <EuiCodeEditor
                  mode="json"
                  theme="textmate"
                  width="100%"
                  height="100%"
                  value={props.ingestResponse}
                  readOnly={true}
                  setOptions={{
                    fontSize: '14px',
                    autoScrollEditorIntoView: true,
                    wrap: true,
                    showLineNumbers: true,
                    showGutter: true,
                  }}
                  tabSize={2}
                />
              </div>
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </>
  );
}
