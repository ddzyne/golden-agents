import CodeMirror from '@uiw/react-codemirror';
import {langs} from '@uiw/codemirror-extensions-langs';
import {gaDark} from '../helpers/CodemirrorTheme';
import styles from './Editor.module.scss';
import {useAppSelector, useAppDispatch} from '../../../app/hooks';
import {setActiveQuery, selectActiveQuery} from '../queryBuilderSlice';

export function Editor() {
  const query = useAppSelector(selectActiveQuery);
  const dispatch = useAppDispatch();

  return (
    <div>
      <h5 className={styles.header}>Manually edit your Sparql code</h5>
      <CodeMirror
        value={query}
        height="20rem"
        extensions={[langs.sparql()]}
        theme={gaDark}
        onChange={(value: string) => dispatch(setActiveQuery(value))}
      />
    </div>
  );
}