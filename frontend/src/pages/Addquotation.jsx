import { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';

const AddQuotation = () => {
  const [quotationColumns, setQuotationColumns] = useState([]);
  const [itemsColumns, setItemsColumns] = useState([]);
  const [quotationData, setQuotationData] = useState({});
  const [itemsData, setItemsData] = useState([{}]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const API_BASE = 'http://127.0.0.1:8000';

  useEffect(() => {
    fetchColumns();
  }, []);

  const fetchColumns = async () => {
    try {
      const [quotationRes, itemsRes] = await Promise.all([
        fetch(`${API_BASE}/quotation/columns`),
        fetch(`${API_BASE}/items/columns`)
      ]);

      const quotationData = await quotationRes.json();
      const itemsData = await itemsRes.json();

      const filteredQuotationCols = quotationData.columns.filter(
        col => col.column_name !== 'id'
      );
      const filteredItemsCols = itemsData.columns.filter(
        col => col.column_name !== 'id' && col.column_name !== 'quotation_id'
      );

      setQuotationColumns(filteredQuotationCols);
      setItemsColumns(filteredItemsCols);

      const initialQuotation = {};
      filteredQuotationCols.forEach(col => {
        initialQuotation[col.column_name] = '';
      });
      setQuotationData(initialQuotation);

      const initialItem = {};
      filteredItemsCols.forEach(col => {
        initialItem[col.column_name] = '';
      });
      setItemsData([initialItem]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching columns:', error);
      setMessage({ type: 'error', text: 'Failed to load form structure' });
      setLoading(false);
    }
  };

  const getInputType = (dataType) => {
    if (dataType.includes('integer') || dataType.includes('numeric')) return 'number';
    if (dataType.includes('date')) return 'date';
    if (dataType.includes('boolean')) return 'checkbox';
    return 'text';
  };

  const formatLabel = (columnName) => {
    return columnName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleQuotationChange = (fieldName, value) => {
    setQuotationData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleItemChange = (index, fieldName, value) => {
    const updatedItems = [...itemsData];
    updatedItems[index] = {
      ...updatedItems[index],
      [fieldName]: value
    };
    setItemsData(updatedItems);
  };

  const addItem = () => {
    const newItem = {};
    itemsColumns.forEach(col => {
      newItem[col.column_name] = '';
    });
    setItemsData([...itemsData, newItem]);
  };

  const removeItem = (index) => {
    if (itemsData.length > 1) {
      setItemsData(itemsData.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);

    try {
      const processedQuotation = { ...quotationData };
      quotationColumns.forEach(col => {
        if (col.data_type.includes('integer') || col.data_type.includes('numeric')) {
          const val = processedQuotation[col.column_name];
          processedQuotation[col.column_name] = val ? Number(val) : null;
        }
      });

      const processedItems = itemsData.map(item => {
        const processedItem = { ...item };
        itemsColumns.forEach(col => {
          if (col.data_type.includes('integer') || col.data_type.includes('numeric')) {
            const val = processedItem[col.column_name];
            processedItem[col.column_name] = val ? Number(val) : null;
          }
        });
        return processedItem;
      });

      const response = await fetch(`${API_BASE}/quotation-with-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          quotation_data: processedQuotation,
          items_data: processedItems
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Quotation created successfully! ID: ${result.quotation_id}, Items: ${result.items_created}` 
        });
        fetchColumns();
      } else {
        setMessage({ type: 'error', text: result.detail || 'Failed to create quotation' });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setMessage({ type: 'error', text: 'An error occurred while submitting the form' });
    } finally {
      setSubmitting(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '32px 16px'
    },
    loadingContainer: {
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    loadingContent: {
      textAlign: 'center'
    },
    spinner: {
      display: 'inline-block',
      width: '48px',
      height: '48px',
      border: '3px solid #e5e7eb',
      borderTop: '3px solid #2563eb',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    loadingText: {
      marginTop: '16px',
      color: '#4b5563'
    },
    wrapper: {
      maxWidth: '1280px',
      margin: '0 auto'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      padding: '24px'
    },
    title: {
      fontSize: '30px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '24px'
    },
    messageBox: {
      marginBottom: '24px',
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid'
    },
    successMessage: {
      backgroundColor: '#f0fdf4',
      color: '#166534',
      borderColor: '#bbf7d0'
    },
    errorMessage: {
      backgroundColor: '#fef2f2',
      color: '#991b1b',
      borderColor: '#fecaca'
    },
    section: {
      marginBottom: '32px'
    },
    sectionHeader: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '16px',
      paddingBottom: '8px',
      borderBottom: '2px solid #3b82f6'
    },
    sectionHeaderFlex: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      paddingBottom: '8px',
      borderBottom: '2px solid #3b82f6'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px'
    },
    fieldContainer: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '4px'
    },
    input: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s'
    },
    itemCard: {
      marginBottom: '24px',
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    },
    itemHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    },
    itemTitle: {
      fontWeight: '500',
      color: '#374151'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    addButton: {
      backgroundColor: '#2563eb',
      color: 'white'
    },
    removeButton: {
      backgroundColor: '#ef4444',
      color: 'white',
      padding: '6px 12px',
      fontSize: '13px'
    },
    resetButton: {
      backgroundColor: 'white',
      color: '#374151',
      border: '1px solid #d1d5db'
    },
    submitButton: {
      backgroundColor: '#16a34a',
      color: 'white'
    },
    disabledButton: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed',
      opacity: 0.6
    },
    buttonContainer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '16px'
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading form structure...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          button:hover:not(:disabled) {
            opacity: 0.9;
            transform: translateY(-1px);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
      `}</style>
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <h1 style={styles.title}>Add New Quotation</h1>

          {message && (
            <div style={{
              ...styles.messageBox,
              ...(message.type === 'success' ? styles.successMessage : styles.errorMessage)
            }}>
              {message.text}
            </div>
          )}

          <div>
            {/* Quotation Details Section */}
            <div style={styles.section}>
              <h2 style={styles.sectionHeader}>
                Quotation Details
              </h2>
              <div style={styles.grid}>
                {quotationColumns.map(column => (
                  <div key={column.column_name} style={styles.fieldContainer}>
                    <label style={styles.label}>
                      {formatLabel(column.column_name)}
                    </label>
                    <input
                      type={getInputType(column.data_type)}
                      value={quotationData[column.column_name] || ''}
                      onChange={(e) => handleQuotationChange(column.column_name, e.target.value)}
                      style={styles.input}
                      placeholder={`Enter ${formatLabel(column.column_name).toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Items Section */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderFlex}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#374151', margin: 0 }}>Items</h2>
                <button
                  type="button"
                  onClick={addItem}
                  style={{...styles.button, ...styles.addButton}}
                >
                  <Plus size={20} />
                  Add Item
                </button>
              </div>

              {itemsData.map((item, index) => (
                <div key={index} style={styles.itemCard}>
                  <div style={styles.itemHeader}>
                    <h3 style={styles.itemTitle}>Item {index + 1}</h3>
                    {itemsData.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        style={{...styles.button, ...styles.removeButton}}
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    )}
                  </div>
                  <div style={styles.grid}>
                    {itemsColumns.map(column => (
                      <div key={column.column_name} style={styles.fieldContainer}>
                        <label style={styles.label}>
                          {formatLabel(column.column_name)}
                        </label>
                        <input
                          type={getInputType(column.data_type)}
                          value={item[column.column_name] || ''}
                          onChange={(e) => handleItemChange(index, column.column_name, e.target.value)}
                          style={{...styles.input, backgroundColor: 'white'}}
                          placeholder={`Enter ${formatLabel(column.column_name).toLowerCase()}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div style={styles.buttonContainer}>
              <button
                type="button"
                onClick={() => fetchColumns()}
                style={{...styles.button, ...styles.resetButton}}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  ...styles.button, 
                  ...styles.submitButton,
                  ...(submitting ? styles.disabledButton : {})
                }}
              >
                <Save size={20} />
                {submitting ? 'Submitting...' : 'Submit Quotation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddQuotation;