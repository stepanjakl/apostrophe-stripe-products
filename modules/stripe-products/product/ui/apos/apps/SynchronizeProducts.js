export default () => {
    apos.bus.$on('synchronize-stripe-products', async () => {
        console.log('-- -- Vue event - synchronize-products')

        /* await apos.notify('apostrophe:minSize', {
          type: 'danger',
          icon: 'alert-circle-icon',
          dismiss: true,
          interpolate: {
            width,
            height
          }
        }); */

        try {
            await apos.http.post('/api/v1/stripe/products/synchronize', {
                body: {
                    "messages": {
                        "progress": "Pulling data from the Stripe account...",
                        "completed": "Products synced."
                    }
                }
            })
        } catch (error) {
            console.error(error)
        } /* finally {
            console.log('-- -- Vue event - synchronize-products - finished')
        } */

       /*  apos.bus.$on('synchronize-stripe-products', async () => {
        apos.bus.$emit('content-changed', {
            doc: null,
            action: 'synchronize-stripe-products'
          }) */


        /*   */

        /* try {
            await apos.http.post(`${this.moduleOptions.action}/${action}`, {
              body: {
                ...requestOptions,
                _ids: this.checked,
                messages: messages,
                type: this.checked.length === 1 ? this.moduleLabels.singular
                  : this.moduleLabels.plural
              }
            });
          } catch (error) {
            apos.notify('apostrophe:errorBatchOperationNoti', {
              interpolate: { operation: label },
              type: 'danger'
            });
            console.error(error);
          } */

    })
}
