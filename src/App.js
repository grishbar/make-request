import {
  React,
  useRef,
  useState,
} from 'react';

import './App.css';

function App() {
  const urlInput = useRef(null);
  const maxRequestsInput = useRef(null);

  const [urls, setUrls] = useState([]);
  const [urlsSet, setUrlsSet] = useState(new Set());

  function addNewUrlItem() {
    const urlItems = urlInput.current.value.split(',').map(item => item.trim());
    const newItems = [];

    let tempSet = new Set([...urlsSet]);
    for (let i = 0; i < urlItems.length; i++) {
      if (urlItems[i]) {
        const newItem = {
          url: urlItems[i],
          status: 'wait',
          isDuplicate: tempSet.has(urlItems[i]),
          result: '',
        };
  
        tempSet.add(urlItems[i]);
        newItems.push(newItem);
      }
    }

    urlInput.current.value = '';
    setUrlsSet(tempSet);
    setUrls([...urls, ...newItems]);
  }

  function promiseRace(promises) {
    return new Promise((fulfil, reject) => {
      promises.forEach((promise, index) => {
        promise.then(data => fulfil({ data, index }), reject);
      });
    })
  };
  
  async function makeParallelLimitedRequests(urlsArr, maxConnections = 20, options = {}) {
    const responsePromises = [];
    const urlAnswers = [];
    maxConnections = Math.min(maxConnections, urlsArr.length);

    for (let i = 0; i < urlsArr.length; i++) {
      let urlItem = urlsArr[i];
      setUrls(updateUrls(urlItem.url, 'in progress', ''));
      if (responsePromises.length >= maxConnections) {
        const { data: response, index } = await promiseRace(responsePromises);
        responsePromises.splice(index, 1);
      }
      if (!urlItem.isDuplicate) {
        responsePromises.push(
          fetch(urlItem.url, options)
            .then(data => data.json())
            .then(response => {
              urlAnswers[i] = response;
              setUrls(updateUrls(urlItem.url, 'resolved', JSON.stringify(response)));
            })
            .catch(error => {
              urlAnswers[i] = error;
              setUrls(updateUrls(urlItem.url, 'rejected', JSON.stringify(error)));
            }));
      }
    }

    return Promise.all(responsePromises).then(() => urlAnswers);
  }
  

  function updateUrls(url, status, result) {
    return urls.map(item => {
      if (item.url === url && item.status !== 'resolved' && item.status !== 'rejected') {
        item.status = status;
        item.result = result;
      }

      return item;
    });
  }

  function startMakingRequests() {
    const responses = makeParallelLimitedRequests(urls, Number(maxRequestsInput.current.value) || 20);
  }

  function addMockData() {
    const mockData = 'https://jsonplaceholder.typicode.com/posts/1, https://jsonplaceholder.typicode.com/posts/2, https://jsonplaceholder.typicode.com/posts/1, 45';
    urlInput.current.value = mockData;
    addNewUrlItem();
  }

  return (
    <div className="App">
      <h1>
        Небольшой сервис иллюстрирующий шину запросов -
        одновременно выполняется ограниченное количество запросов
        и как только один из них выполнится в очередь добавляется следующий
      </h1>
      <form>
        <div>
          Введите один, или несколько url через запятую:
        </div>
        <input
          type="text"
          id="url"
          ref={urlInput}
        />
        <button
          type="button"
          onClick={addNewUrlItem}
        >
          Добавить
        </button>
        <button
          type="button"
          onClick={addMockData}
        >
          Use mock data
        </button>
        <div>
          Введите максимальное число одновременных запросов:
        </div>
        <input
          type="number"
          ref={maxRequestsInput}
        />
        <button
          type="button"
          onClick={startMakingRequests}
        >
          Start requests
        </button>
      </form>
      {Boolean(urls.length) && (
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Status</th>
              <th>isDuplicate</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {urls.map((urlItem, index) => (
              <tr key={Date.now() + index}>
                <td>{urlItem.url}</td>
                <td>{urlItem.status}</td>
                <td>{String(urlItem.isDuplicate)}</td>
                <td>{urlItem.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
