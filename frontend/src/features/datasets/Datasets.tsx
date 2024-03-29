import React, {useEffect} from 'react';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import styles from './Datasets.module.scss';
import {useGetDatasetsQuery} from './datasetsApi';
import {useAppSelector, useAppDispatch} from '../../app/hooks';
import {AnimatePresence} from 'framer-motion';
import Spinner from 'react-bootstrap/Spinner';
import {setSelectedDatasets, selectSelectedDatasets} from './datasetsSlice';
import type {Dataset} from '../../types/datasets';
import {FadeDiv} from '../animations/Animations';
import {useTranslation} from 'react-i18next';
import {Tip} from '../tooltip/Tooltip';
import InfoCircle from '../../images/circle-info-solid.svg';

// TODO / To think about: Should selecting/deselecting datasets reset the QB? 
// Right now, the QB dropdown boxes get filled via a call to the API that 
// includes the dataset selection. So the app makes an API call on every dataset 
// change, and dropdown content should change depending on selected datasets. 
// If the content disappears, we do need to reset the QB for the query to remain
// valid. We don't right now.

export const Datasets = () => {
  const {data, isFetching, isError} = useGetDatasetsQuery(undefined);
  const currentDatasets = useAppSelector(selectSelectedDatasets);
  const dispatch = useAppDispatch();
  const {t} = useTranslation(['datasets']);

  // enable all datasets by default/on load
  useEffect(() => {
    data?.length > 0 && dispatch(setSelectedDatasets(data));
  }, [data, dispatch]);

  function toggleDataset(set: Dataset) {
    const filteredSets = currentDatasets.filter((activeSet: Dataset) => activeSet.id !== set.id);
    dispatch(setSelectedDatasets(filteredSets.length < currentDatasets.length ? filteredSets : currentDatasets.concat(set)))
  }

  return (
    <Card bg="light" className={styles.card}>
      <Card.Header as="h5">{t('header')}</Card.Header>
      <Card.Body>
        <AnimatePresence mode="wait">
          {isFetching ?
            <FadeDiv key="datasets-loader">
              <Spinner animation="border" variant="primary" />
            </FadeDiv>
            :
            <FadeDiv key="datasets">
              {isError ?
                <Card.Title as="h6">{t('error')}</Card.Title>
                :
                <>
                  <Card.Title as="h6">{t('select')}</Card.Title>
                  <Form>
                    {data.map((set: Dataset) => (
                      <div key={set.id} className={styles.dataset}>
                        <Form.Check 
                          checked={currentDatasets.some((s: Dataset) => s.id === set.id)}
                          type="switch"
                          id={set.id}
                          value={set.id}
                          name={set.name}
                          label={set.name}
                          onChange={() => toggleDataset(set)}
                        />
                        <Tip 
                          id={set.id}
                          content="TODO via API: hier kort wat content over wat deze dataset is"
                          triggerElement={<img src={InfoCircle} className={styles.info} alt=""/>}
                        />
                      </div>
                    ))}
                  </Form>
                </>
              }
            </FadeDiv>
          }
        </AnimatePresence>
      </Card.Body>
    </Card>
  )
}
