import React, {useState, useEffect} from 'react';
import type {ReactElement, FormEvent} from 'react';
import {useAppSelector, useAppDispatch} from '../../app/hooks';
import {v4 as uuidv4} from 'uuid';
import update from 'immutability-helper';
import {setActiveQuery} from './queryBuilderSlice';
import Select, {components, OptionProps} from 'react-select';
import type {Theme} from 'react-select';
import styles from './QueryBuilder.module.scss';
import * as queries from './helpers/queries';
import {useSendSparqlQuery} from '../sparql/sparqlApi';
import {selectedDatasets} from '../datasets/datasetsSlice';
import Spinner from 'react-bootstrap/Spinner';

// TODO: some more filters? Not only text, also data/year etc

type SparqlObject = {
  // as returned by a sparql db
  type: string;
  value: string;
}

type EntityData = {
  c: SparqlObject; // uri to get properties of in next step
  l?: SparqlObject; // label
  p?: SparqlObject; // parent, we don't do anything with this yet
  pred?: never;
  tpe?: never;
  dt?: never;
  ot?: never;
}

type PropertyData = {
  l?: SparqlObject; // label
  pred: SparqlObject; // uri to use in the sparql query
  tpe: SparqlObject; // type of property
  dt?: SparqlObject; // type of data
  ot?: SparqlObject; // entity the property belongs to, we use this to delve deeper
  c?: never;
  p?: never;
}

export type Entity = {
  label: string; // appears in the dropdown
  value: string; // this is the uri (value from c)
  uuid: string;
}

type DataType = string; // possibly narrow this down later on, depending on the data types we might get

export type Property = {
  label: string; // appears in the dropdown
  value: string; // this is the uri, or filter
  uuid: string; // unique id/key for use in array map
  ot?: string; // value of ot
  propertyType?: string;
  dataType?: string; // derived from optional dt
  labelForQuery?: string; // value that gets passed as a label to the sparql query
}

type ActionTypes = {
  action: 'clear' | 'create-option' | 'deselect-option' | 'pop-value' | 'remove-value' | 'select-option' | 'set-value';
  option?: Property | Entity;
  removedValue?: Property | Entity;
  removedValues: Property[] | Entity[];
}

const defaultPropEntState = {label: '', value: '', uuid: ''};

export const Builder = () => {
  const dispatch = useAppDispatch();

  const [selectedEntity, setSelectedEntity] = useState<Entity>(defaultPropEntState);
  const [selectedProperties, setSelectedProperties] = useState<Property[][]>([]);

  // Set query in code editor when one of these values changes
  useEffect(() => {
    const theQuery = queries.resultQuery(selectedEntity, selectedProperties);
    selectedEntity.value && dispatch(setActiveQuery(theQuery));
  }, [selectedEntity, selectedProperties, dispatch]);
  
  // Keep track of selections and set tree accordingly
  const setEntity = (data: Entity) => {
    setSelectedEntity(data ? data : defaultPropEntState);
    // reset properties
    setSelectedProperties([]);
  }

  const setProperties = (data: Property, changedValue: ActionTypes, level?: number, propertyArrayIndex?: number) => {
    // Properties trees are arrays within the property array: [ [{propertyObject}, {propertyObject}], [{propertyObject}] ]
    // Keep track of these arrays using the propertyArrayIndex (index # of parent array) and level (index # of object being selected)
    switch(changedValue.action) {
      case 'select-option':
        // add new value to state, or change existing value
        if (propertyArrayIndex === undefined) {
          // first property, so new property tree
          setSelectedProperties([...selectedProperties, [changedValue.option as Property]]);
        }
        else {
          // add or change existing property tree
          const newPropertyTree = [...selectedProperties[propertyArrayIndex].slice(0, level), data];
          const newState = update(selectedProperties, {[propertyArrayIndex]: {$set: newPropertyTree}});    
          setSelectedProperties(newState);
        }
        break;

      case 'clear':
        // clear: pressing the X in selectbox
        if (propertyArrayIndex === undefined) {
          // reset all if entity properties are cleared
          setSelectedProperties([]);
        }
        else {
          // single selection for sub-properties, just remove object from array tree
          const newPropertyTree = [...selectedProperties[propertyArrayIndex].slice(0, level)];
          const newState = update(selectedProperties, {[propertyArrayIndex]: {$set: newPropertyTree}});
          setSelectedProperties(newState);
        }
        break;

      case 'remove-value':
        // Only for multiselect, remove individual values
        const removeIndex = selectedProperties.findIndex(oldPropArr => oldPropArr.some(oldProp => changedValue.removedValue!.uuid === oldProp.uuid));
        const newState = update(selectedProperties, {$splice: [[removeIndex, 1]]});
        setSelectedProperties(newState);
        break;
    }
  }

  const setFilter = (e: FormEvent<HTMLInputElement>, level: number, propertyArrayIndex: number, dataType: DataType) => {
    const target = e.target as HTMLInputElement;
    const newProperty = target.value ? 
      [...selectedProperties[propertyArrayIndex].slice(0, level), ...[{
        label: '',
        value: target.value,
        dataType: dataType + 'Filter',
        uuid: '',
      }]] 
      :
      [...selectedProperties[propertyArrayIndex].slice(0, level)];
    const newState = update(selectedProperties, {[propertyArrayIndex]: {$set: newProperty}});    
    setSelectedProperties(newState);
  }

  return (
    <div className={styles.queryBuilder}>
      <h5 className={styles.header}>Build your query</h5>

      <Selector 
        onChange={setEntity}
        type="entity"
        multiSelect={false} />

      {selectedEntity.value.length > 0 &&
        <Selector
          type="property"
          parentUri={selectedEntity.value} 
          parentLabel={selectedEntity.label}
          onChange={setProperties} 
          multiSelect={true}
          level={0}
          value={selectedProperties.map( (property) => property[0] )} />
      }
      {selectedProperties.map((propertyArray, i) =>
        <div 
          key={`group-${propertyArray[0].uuid}`}
          className={propertyArray[0].dataType === 'string' || propertyArray[0].ot ? styles.propertyGroup : ''}>
          {propertyArray.map((property, j) => [
            property.ot && 
              <Selector
                type="property" 
                key={property.uuid}
                parentUri={property.ot} 
                parentLabel={property.label}
                labelForQuery={property.labelForQuery}
                onChange={setProperties} 
                multiSelect={false}
                propertyArrayIndex={i}
                level={j+1}
                value={selectedProperties[i][j+1]} />,

            property.dataType && property.dataType === 'string' && 
                <Input 
                  key={`stringFilter-${property.uuid}`}
                  level={j+1}
                  propertyArrayIndex={i}
                  onChange={setFilter}
                  label={<label className={styles.label}><strong>{property.label}</strong> must contain</label>}
                  placeholder="Enter optional text to filter on..."
                  dataType={property.dataType}
                  value={selectedProperties[i][j+1]?.value} />
            ]
          )}
        </div>
      )}
    </div>
  )
}

interface OnChangeData {
  (
    data: Property | Entity,
    changedValue: ActionTypes, 
    level?: number, 
    propertyArrayIndex?: number
  ): void;
}

type SelectorProps = {
  onChange: OnChangeData;
  type: 'entity' | 'property';
  parentUri?: string;
  parentLabel?: string;
  labelForQuery?: string;
  multiSelect: boolean;
  level?: number;
  propertyArrayIndex?: number;
  value?: Property[] | Property;
}

const Selector = ({onChange, type, parentUri, parentLabel, labelForQuery, multiSelect, level, propertyArrayIndex, value}: SelectorProps) => {
  const currentDatasets = useAppSelector(selectedDatasets);

  const {data, isFetching, isError} = useSendSparqlQuery({
    query: type === 'entity' ? queries.entityQuery : queries.propertyQuery(parentUri as string), 
    datasets: currentDatasets
  });

  const results = data?.results.bindings;

  // Reformat results
  const resultsOptions = results && 
    results.map((item: EntityData | PropertyData) => {
      const uuid = uuidv4();
      if (type === 'entity') {
        return {
          label: item.l ? item.l.value : queries.getLabel(item.c!.value),
          value: item.c!.value,
          uuid: uuid,
        }
      }
      else {
        const otLabel = item.ot && queries.getLabel(item.ot!.value);
        const label = item.l ? item.l.value : queries.getLabel(item.pred!.value);
        const newLabelForQuery = labelForQuery ? 
          `${labelForQuery}_${label}${otLabel ? `_${otLabel}` : ''}` : 
          `${label}${otLabel ? `_${otLabel}` : ''}`;
        return {
          label: `${label}${otLabel ? `: ${otLabel}` : ''}`,
          value: item.pred!.value,
          ot: item.ot && item.ot?.value,
          propertyType: queries.getLabel(item.tpe!.value),
          dataType: item.dt && queries.getLabel(item.dt!.value), 
          labelForQuery: newLabelForQuery,
          uuid: uuid,
        }
      }
    }).sort((a: Entity | Property, b: Entity | Property) => {
      const la = a.label.toLowerCase(),
            lb = b.label.toLowerCase();
      return la < lb ? -1 : (la > lb ? 1 : 0)
    });

  return (
    <div style={{paddingLeft: `${level ? level * 2 - 2 : 0}rem`}} className={level !== undefined ? styles.level : ''}>
      {type === 'entity' ?
        <label className={styles.label}>
          Pick an entity you wish to explore
        </label>
        :
        <label className={styles.label}>
          Select properties for <strong>{parentLabel}</strong>
        </label>
      }
      <Select 
        components={{ Option: CustomOption }}
        isOptionSelected={(option, selectValue) =>
          selectValue.some(v => 
            (v as Property | Entity).label === (option as Property | Entity).label && 
            (v as Property | Entity).value === (option as Property | Entity).value
          )
        }
        className={styles.select}
        options={resultsOptions} 
        placeholder="Select..."
        isMulti={multiSelect}
        value={value}
        isClearable={true}
        noOptionsMessage={() => isFetching ? 
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
          /> : 
          ( isError ? 'Something\'s gone wrong with fetching the data' : 'Nothing found')
        }
        onChange={(data, changedValue) => onChange(data as Property | Entity, changedValue as ActionTypes, level, propertyArrayIndex)}
        theme={theme} />
    </div>
  );
}

interface CustomOptionProps extends OptionProps {
  data: unknown;
}

const CustomOption = (props: CustomOptionProps) => {
  const propertyData = props.data as Property;
  const propertyOrEntityData = props.data as Property | Entity;
  return (
    <components.Option  className='boooo' {...props}>
      {propertyOrEntityData.label} 
      {propertyData.propertyType && 
        <span className={styles.propertyType}>
          {propertyData.propertyType} 
        </span>
      }
      <span className={styles.schema}>
        {propertyOrEntityData.value} 
      </span>
    </components.Option>
  )
}

// theme for the selection boxes
const theme = (theme: Theme) => ({
  ...theme,
  borderRadius: 0,
  colors: {
    ...theme.colors,
    primary25: '#efc501',
    primary: 'black',
  }
});

interface OnChangeFilter {
  (e: FormEvent<HTMLInputElement>, level: number, propertyArrayIndex: number, dataType: DataType): void;
}

type InputProps = {
  label: ReactElement;
  level: number;
  propertyArrayIndex: number;
  onChange: OnChangeFilter;
  placeholder: string;
  dataType: DataType;
  value: string;
}

const Input = ({label, level, propertyArrayIndex, onChange, placeholder, dataType, value}: InputProps) => {
  return (
    <div style={{paddingLeft: `${level ? level * 2 - 2: 0}rem`}}>
      {label}
      <input 
        type="text" 
        className={styles.textInput} 
        placeholder={placeholder}
        value={value || ''}
        onChange={e => onChange(e, level, propertyArrayIndex, dataType)}/>
    </div>
  )
}