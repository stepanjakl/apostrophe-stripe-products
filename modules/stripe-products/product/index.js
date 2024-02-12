module.exports = {
    extend: '@apostrophecms/piece-type',
    options: {
        alias: 'stripeProduct',
        label: 'Product',
        pluralLabel: 'Products',
        quickCreate: false,
        searchable: false,
        // showCreate: false
    },
    batchOperations: {
        remove: ['publish']
    },
    utilityOperations(self) {
        return {
            add: {
                /*  button: {
                     label: 'apostrophe:moreOperations',
                     iconOnly: true,
                     icon: 'dots-vertical-icon',
                     type: 'outline'
                 }, */
                synchronizeProducts: {
                    label: 'stripeProducts:synchronizeProducts',
                    canEdit: true,
                    button: true,
                    // iconOnly: true,
                    // icon: 'dots-vertical-icon',
                    // type: 'outline'
                    eventOptions: {
                        event: 'synchronize-stripe-products'
                    }
                },
                /* test: {
                    label: 'AHOJ',
                    canEdit: true,
                    relationship: true,
                    label: {
                        key: 'TEST',
                        type: `$t(${self.options.label})`
                    },
                    eventOptions: {
                        event: 'edit',
                        type: self.__meta.name
                    }
                } */
            },
            // remove: ['new']
        }
    },
    fields: {
        add: {

        }
    },
    /* init(self) {
        const groupName = 'stripe'
        const itemsToAdd = ['stripe-products/product']

        // Check if 'stripe' already exists in self.apos.adminBar.groups
        const existingStripeGroup = self.apos.adminBar.groups.find(group => group.name === groupName)

        const newStripeGroup = {
            name: groupName,
            label: 'Stripe',
            items: itemsToAdd
        }

        // If 'stripe' exists, add items to the existing one; otherwise, create a new group
        if (existingStripeGroup) {
            existingStripeGroup.items = existingStripeGroup.items.concat(itemsToAdd)
        } else {
            self.apos.adminBar.groups.push(newStripeGroup)
        }
    }, */
    /* handlers(self, options) {
        return {
            'synchronizeProducts': {
                async fetchAndSaveStripeProducts() {
                    console.log('-- -- called synchronizeProducts');
                }
            }
        }
    } */
}
