import React from 'react';

export interface LoadingProps {
  title?: string;
  desc?: string;
}

export const Loading = (props: LoadingProps): JSX.Element => {
  return (
    <div className="loading-container">
      <div className="lds-ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      {props.title && <p className="title">{props.title}</p>}
      {props.desc && <p className="desc">{props.desc}</p>}
    </div>
  );
};
