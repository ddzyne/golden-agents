import CodeMirror from '@uiw/react-codemirror';
import { langs } from '@uiw/codemirror-extensions-langs';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import styles from './QueryBuilder.module.scss';

import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { setActiveQuery, selectQuery } from './queryBuilderSlice';

export function Editor() {

  const query = useAppSelector(selectQuery);
  const dispatch = useAppDispatch();

  return (
    <div>
      <h5 className={styles.header}>Manually edit your Sparql code</h5>
      <CodeMirror
        value={query}
        height="20rem"
        extensions={[langs.sparql()]}
        theme={githubDark}
        onChange={ (value: string) => dispatch(setActiveQuery(value)) }
      />
    </div>
  );
}
